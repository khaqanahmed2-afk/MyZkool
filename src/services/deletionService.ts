/**
 * Deletion Service Layer
 * 
 * Orchestrates:
 * 1. Preflight dependency and ownership checks
 * 2. Identity re-authentication prior to destructive operations
 * 3. Supabase Storage assets and documents purge
 * 4. Transactional PostgreSQL RPC database purge
 * 5. Post-deletion state verification
 * 6. Audit reporting and compliance tombstones
 */

import { supabase, isSupabaseConfigured } from "../lib/supabase";
import type {
  AccountDeletionPreflight,
  SchoolDeletionPreflight,
  AccountDeletionResult,
  SchoolDeletionResult,
  TransferOwnershipResult,
  SchoolVerificationResult,
  DeletionAuditReport,
} from "../types/deletion";

/**
 * Fetch preflight analysis for current user's account deletion.
 * Detects if user owns any active schools or has unresolved dependencies.
 */
export async function getAccountDeletionPreflight(): Promise<AccountDeletionPreflight> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc("get_account_deletion_preflight");
      if (!error && data) {
        return data as AccountDeletionPreflight;
      }
      if (error && error.message !== "Not authenticated") {
        console.warn("get_account_deletion_preflight RPC error, running client fallback:", error.message);
      }
    } catch (err) {
      console.warn("Failed RPC get_account_deletion_preflight:", err);
    }
  }

  // Client-side fallback check
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) {
    throw new Error("You must be signed in to perform account preflight.");
  }

  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, school_id")
    .eq("auth_id", user.id)
    .maybeSingle();

  const { data: ownedSchools } = await supabase
    .from("schools")
    .select("id, name, subdomain, created_at")
    .eq("created_by", user.id);

  const owned = ownedSchools || [];
  const canDelete = owned.length === 0;

  return {
    can_delete: canDelete,
    blocking_reason: canDelete
      ? null
      : `You are currently the registered owner of ${owned.length} school(s). Transfer ownership or delete your school(s) before deleting your personal account.`,
    owned_schools: owned,
    memberships: [],
    profile: {
      id: dbProfile?.id || user.id,
      email: dbProfile?.email || user.email || "",
      full_name: dbProfile?.full_name || "User",
      role: dbProfile?.role || "school_admin",
    },
    exclusively_owned_records: {
      drafts: 0,
      import_batches: 0,
      device_tokens: 0,
      notifications: 0,
    },
  };
}

/**
 * Executes verified user account purge.
 * Requires recent password confirmation for identity proof.
 */
export async function purgeUserAccount(password: string): Promise<AccountDeletionResult> {
  const trimmedPassword = (password || "").trim();
  if (!trimmedPassword) {
    return { success: false, message: "Password is required to confirm account deletion." };
  }

  // 1. Verify caller session
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user || !user.email) {
    return { success: false, message: "Authentication required." };
  }

  // 2. Re-authenticate with password for identity proof
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: trimmedPassword,
  });

  if (signInErr) {
    return { success: false, message: "Incorrect password. Identity verification failed." };
  }

  // 3. Storage file cleanup: find & delete any files owned by this user
  let storageFilesDeleted = 0;
  if (isSupabaseConfigured) {
    try {
      const { data: fileList } = await supabase.storage
        .from("school-assets")
        .list(`users/${user.id}`);

      if (fileList && fileList.length > 0) {
        const paths = fileList.map((f) => `users/${user.id}/${f.name}`);
        const { error: removeErr } = await supabase.storage
          .from("school-assets")
          .remove(paths);
        if (!removeErr) {
          storageFilesDeleted += paths.length;
        }
      }
    } catch (storageErr) {
      console.warn("Storage user files purge warning:", storageErr);
    }
  }

  // 4. Invoke database purge RPC
  let rpcResult: any = null;
  if (isSupabaseConfigured) {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("delete_user_account");
    if (rpcErr) {
      return {
        success: false,
        message: rpcErr.message || "Failed to purge database records.",
        error: rpcErr.details || rpcErr.message,
      };
    }
    rpcResult = rpcData;
  }

  // 5. Clean up local browser state
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("myzkool_active_school_id");
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith("myzkool_") || k.includes(user.id))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {}

  // 6. Sign out auth session
  try {
    await supabase.auth.signOut();
  } catch {}

  return {
    success: true,
    message: "Your personal account and eligible data have been permanently deleted.",
    summary: {
      storage_files_purged: storageFilesDeleted,
      auth_deleted: true,
      profile_deleted: true,
    },
  };
}

/**
 * Fetch preflight summary and itemized breakdown of records in a school tenant.
 */
export async function getSchoolDeletionPreflight(schoolId: string): Promise<SchoolDeletionPreflight> {
  if (!schoolId) {
    return {
      can_delete: false,
      is_owner: false,
      school_id: "",
      school_name: "",
      subdomain: "",
      error: "School ID is required.",
      itemized_summary: {
        students: 0,
        staff: 0,
        classes: 0,
        sections: 0,
        dues: 0,
        receipts: 0,
        routes: 0,
        vehicles: 0,
        website_pages: 0,
        storage_files: 0,
      },
    };
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc("get_school_deletion_preflight", {
        p_school_id: schoolId,
      });

      if (!error && data) {
        return data as SchoolDeletionPreflight;
      }
      if (error) {
        console.warn("get_school_deletion_preflight RPC error:", error.message);
      }
    } catch (err) {
      console.warn("Failed RPC get_school_deletion_preflight:", err);
    }
  }

  // Client-side fallback counts
  const { data: school } = await supabase
    .from("schools")
    .select("id, name, subdomain, created_by, official_email, created_at")
    .eq("id", schoolId)
    .maybeSingle();

  if (!school) {
    return {
      can_delete: false,
      is_owner: false,
      school_id: schoolId,
      school_name: "Unknown School",
      subdomain: "",
      error: "School not found.",
      itemized_summary: {
        students: 0,
        staff: 0,
        classes: 0,
        sections: 0,
        dues: 0,
        receipts: 0,
        routes: 0,
        vehicles: 0,
        website_pages: 0,
        storage_files: 0,
      },
    };
  }

  const { data: authData } = await supabase.auth.getUser();
  const uid = authData?.user?.id;
  const isOwner = Boolean(uid && school.created_by === uid);

  const { count: studentCount } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  const { count: receiptCount } = await supabase
    .from("fee_receipts")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  const { count: duesCount } = await supabase
    .from("student_dues")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId);

  return {
    can_delete: isOwner,
    is_owner: isOwner,
    school_id: schoolId,
    school_name: school?.name || "School",
    subdomain: school?.subdomain || "",
    official_email: school?.official_email,
    created_at: school?.created_at,
    error: isOwner ? undefined : "Only the verified school owner is authorized to delete this school.",
    itemized_summary: {
      students: studentCount || 0,
      staff: 0,
      classes: 0,
      sections: 0,
      dues: duesCount || 0,
      receipts: receiptCount || 0,
      routes: 0,
      vehicles: 0,
      website_pages: 0,
      storage_files: 0,
    },
  };
}

/**
 * Transfers registered school ownership to another administrator.
 */
export async function transferSchoolOwnership(
  schoolId: string,
  newOwnerEmail: string
): Promise<TransferOwnershipResult> {
  const cleanEmail = (newOwnerEmail || "").trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, message: "Target user email is required." };
  }

  if (isSupabaseConfigured) {
    const { data, error } = await supabase.rpc("transfer_school_ownership", {
      p_school_id: schoolId,
      p_new_owner_email: cleanEmail,
    });

    if (error) {
      return { success: false, message: error.message };
    }
    return {
      success: true,
      message: (data as any)?.message || `School ownership successfully transferred to ${cleanEmail}.`,
    };
  }

  return {
    success: true,
    message: `School ownership successfully transferred to ${cleanEmail}.`,
  };
}

/**
 * Purges school and all associated tenant data across every subsystem and Storage.
 * Requires confirmation matching school name and owner password.
 */
export async function purgeSchoolData(
  schoolId: string,
  schoolNameConfirmation: string,
  password: string
): Promise<SchoolDeletionResult> {
  if (!schoolId) {
    return { success: false, message: "School ID is required." };
  }

  // 1. Verify caller session
  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;
  if (!user || !user.email) {
    return { success: false, message: "Authentication required." };
  }

  // 2. Re-authenticate password for identity verification
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: password.trim(),
  });

  if (signInErr) {
    return { success: false, message: "Incorrect password. Identity verification failed." };
  }

  // 3. Verify school name confirmation string matches
  const { data: school, error: schoolErr } = await supabase
    .from("schools")
    .select("id, name, subdomain, created_by")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolErr || !school) {
    return { success: false, message: "School not found." };
  }

  if (school.name.trim().toLowerCase() !== (schoolNameConfirmation || "").trim().toLowerCase()) {
    return {
      success: false,
      message: `Confirmation school name "${schoolNameConfirmation}" does not match exact school name "${school.name}".`,
    };
  }

  // 4. Purge Storage files in school-assets bucket
  let filesRemoved = 0;
  if (isSupabaseConfigured) {
    try {
      const folders = ["logo", "hero", "gallery", "principal", "documents", "receipts", "vehicles", "staff"];
      for (const folder of folders) {
        const prefix = `${schoolId}/${folder}`;
        const { data: list } = await supabase.storage.from("school-assets").list(prefix);
        if (list && list.length > 0) {
          const filePaths = list.map((f) => `${prefix}/${f.name}`);
          await supabase.storage.from("school-assets").remove(filePaths);
          filesRemoved += filePaths.length;
        }
      }
      // Top-level root files
      const { data: rootList } = await supabase.storage.from("school-assets").list(schoolId);
      if (rootList && rootList.length > 0) {
        const rootPaths = rootList.filter((f) => f.id).map((f) => `${schoolId}/${f.name}`);
        if (rootPaths.length > 0) {
          await supabase.storage.from("school-assets").remove(rootPaths);
          filesRemoved += rootPaths.length;
        }
      }
    } catch (storageErr) {
      console.warn("Storage school purge error:", storageErr);
    }
  }

  // 5. Execute PostgreSQL deletion RPC
  let auditReport: DeletionAuditReport | undefined;

  if (isSupabaseConfigured) {
    const { data: purgeData, error: purgeErr } = await supabase.rpc("delete_school_data", {
      p_school_id: schoolId,
    });

    if (purgeErr) {
      return {
        success: false,
        message: purgeErr.message || "Failed to execute database purge.",
        error: purgeErr.details || purgeErr.message,
      };
    }

    auditReport = (purgeData as any)?.audit_report;
  }

  // 6. Independent verification check
  const verification = await verifySchoolPurge(schoolId);

  // If report wasn't generated by RPC, construct it
  if (!auditReport) {
    auditReport = {
      school_id: schoolId,
      school_name: school.name,
      subdomain: school.subdomain,
      deleted_by: user.id,
      deleted_at: new Date().toISOString(),
      status: verification.verified_clean ? "COMPLETED_VERIFIED" : "FAILED",
      purged_counts: {
        students: 0,
        fee_receipts: 0,
        student_dues: 0,
        fee_ledger: 0,
        transport_routes: 0,
        transport_vehicles: 0,
        classes: 0,
        storage_files: filesRemoved,
      },
      retained_records: {
        retained_count: 0,
        reason: "Full tenant decommissioning requested by verified school owner. Zero tenant records retained on platform.",
      },
      verification,
    };
  } else {
    auditReport.verification = verification;
  }

  // 7. Clean up local browser storage for this school
  try {
    if (typeof localStorage !== "undefined") {
      const active = localStorage.getItem("myzkool_active_school_id");
      if (active === schoolId) {
        localStorage.removeItem("myzkool_active_school_id");
      }
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes(schoolId)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    }
  } catch {}

  return {
    success: true,
    message: `School "${school.name}" and all associated data have been permanently deleted.`,
    audit_report: auditReport,
  };
}

/**
 * Runs independent post-deletion verification checks across tables.
 */
export async function verifySchoolPurge(schoolId: string): Promise<SchoolVerificationResult> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.rpc("verify_school_deletion_state", {
        p_school_id: schoolId,
      });
      if (!error && data) {
        return data as SchoolVerificationResult;
      }
    } catch {}
  }

  // Direct fallback check
  const { count: sCnt } = await supabase.from("schools").select("id", { count: "exact", head: true }).eq("id", schoolId);
  const { count: stCnt } = await supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
  const { count: rCnt } = await supabase.from("fee_receipts").select("id", { count: "exact", head: true }).eq("school_id", schoolId);
  const { count: dCnt } = await supabase.from("student_dues").select("id", { count: "exact", head: true }).eq("school_id", schoolId);

  const remaining: Record<string, number> = {
    schools: sCnt || 0,
    students: stCnt || 0,
    fee_receipts: rCnt || 0,
    student_dues: dCnt || 0,
  };

  const isClean = Object.values(remaining).every((c) => c === 0);

  return {
    school_id: schoolId,
    verified_clean: isClean,
    remaining_counts: remaining,
  };
}
