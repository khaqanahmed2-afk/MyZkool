import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { logPlatformAction } from "./masterAdminAuditService";

export interface MasterAdminTicket {
  id: string;
  ticket_number: string;
  school_id: string;
  school_name: string;
  creator_name: string;
  creator_email: string;
  subject: string;
  category: "fees" | "students" | "transport" | "website" | "login" | "billing" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting_school" | "resolved" | "closed";
  assigned_to?: string | null;
  assigned_admin_name?: string | null;
  resolution_summary?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasterAdminTicketMessage {
  id: string;
  ticket_id: string;
  sender_type: "school_user" | "platform_admin" | "system";
  sender_id: string;
  sender_name: string;
  message: string;
  is_internal_note: boolean;
  created_at: string;
}

const mockTicketsStore: MasterAdminTicket[] = [
  {
    id: "tkt-001",
    ticket_number: "#T-4821",
    school_id: "sch-001",
    school_name: "Sunrise Public School",
    creator_name: "Ramesh Sharma (Accountant)",
    creator_email: "accounts@sunrisepublic.edu.in",
    subject: "Fee invoice not generating for Nursery Class section B",
    category: "fees",
    priority: "high",
    status: "resolved",
    assigned_to: "admin-super-01",
    assigned_admin_name: "Khaqan Ahmad",
    resolution_summary: "Fee head mapping sequence repaired in database.",
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
  {
    id: "tkt-002",
    ticket_number: "#T-4822",
    school_id: "sch-002",
    school_name: "St. Mary's Convent High School",
    creator_name: "Sister Teresa (Principal)",
    creator_email: "principal@stmarys.ac.in",
    subject: "Transport bus route GPS sync delay on mobile",
    category: "transport",
    priority: "urgent",
    status: "in_progress",
    assigned_to: "admin-support-01",
    assigned_admin_name: "Support Specialist",
    created_at: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "tkt-003",
    ticket_number: "#T-4823",
    school_id: "sch-003",
    school_name: "Green Valley International School",
    creator_name: "Deepak Verma (Admin)",
    creator_email: "admin@greenvalley.edu.in",
    subject: "Aadhaar masking question for TC export",
    category: "students",
    priority: "medium",
    status: "open",
    assigned_to: null,
    created_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
  },
];

const mockTicketMessagesStore: MasterAdminTicketMessage[] = [
  {
    id: "msg-001",
    ticket_id: "tkt-001",
    sender_type: "school_user",
    sender_id: "user-school-01",
    sender_name: "Ramesh Sharma",
    message: "When we try to generate term invoice for Nursery B students, the dialog closes without creating invoice ID.",
    is_internal_note: false,
    created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: "msg-002",
    ticket_id: "tkt-001",
    sender_type: "platform_admin",
    sender_id: "admin-super-01",
    sender_name: "Khaqan Ahmad",
    message: "Investigating the fee structure junction table. Looks like nursery term slab lacked a start date.",
    is_internal_note: true, // INTERNAL NOTE
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "msg-003",
    ticket_id: "tkt-001",
    sender_type: "platform_admin",
    sender_id: "admin-super-01",
    sender_name: "Khaqan Ahmad",
    message: "We have resolved the structure configuration. You can now generate Nursery B invoices normally.",
    is_internal_note: false,
    created_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
  },
];

/**
 * Returns tickets list with optional filtering
 */
export async function getMasterAdminTickets(options?: {
  status?: string;
  priority?: string;
  category?: string;
}): Promise<MasterAdminTicket[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("support_tickets")
        .select(`
          *,
          schools (
            name
          ),
          platform_admins (
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (options?.status && options.status !== "all") query = query.eq("status", options.status);
      if (options?.priority && options.priority !== "all") query = query.eq("priority", options.priority);
      if (options?.category && options.category !== "all") query = query.eq("category", options.category);

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data.map((t: any) => ({
          ...t,
          school_name: t.schools?.name || "School Partner",
          assigned_admin_name: t.platform_admins?.full_name || null,
        }));
      }
    } catch {}
  }

  let results = [...mockTicketsStore];
  if (options?.status && options.status !== "all") {
    results = results.filter((t) => t.status === options.status);
  }
  if (options?.priority && options.priority !== "all") {
    results = results.filter((t) => t.priority === options.priority);
  }
  if (options?.category && options.category !== "all") {
    results = results.filter((t) => t.category === options.category);
  }
  return results;
}

/**
 * Returns single ticket with conversation thread
 */
export async function getMasterAdminTicketDetail(ticketId: string): Promise<{
  ticket: MasterAdminTicket;
  messages: MasterAdminTicketMessage[];
} | null> {
  const ticket = mockTicketsStore.find((t) => t.id === ticketId || t.ticket_number === ticketId);
  if (!ticket) return null;

  const messages = mockTicketMessagesStore.filter((m) => m.ticket_id === ticket.id);
  return { ticket, messages };
}

/**
 * Adds a message or internal note to a ticket
 */
export async function addTicketMessage(input: {
  ticketId: string;
  senderType: "school_user" | "platform_admin" | "system";
  senderId: string;
  senderName: string;
  message: string;
  isInternalNote: boolean;
  adminEmail?: string;
}): Promise<MasterAdminTicketMessage> {
  const newMsg: MasterAdminTicketMessage = {
    id: `msg-${Date.now().toString(36)}`,
    ticket_id: input.ticketId,
    sender_type: input.senderType,
    sender_id: input.senderId,
    sender_name: input.senderName,
    message: input.message.trim(),
    is_internal_note: input.isInternalNote,
    created_at: new Date().toISOString(),
  };

  mockTicketMessagesStore.push(newMsg);

  if (isSupabaseConfigured) {
    try {
      await supabase.from("support_ticket_messages").insert({
        ticket_id: newMsg.ticket_id,
        sender_type: newMsg.sender_type,
        sender_id: newMsg.sender_id,
        sender_name: newMsg.sender_name,
        message: newMsg.message,
        is_internal_note: newMsg.is_internal_note,
      });
    } catch {}
  }

  if (input.adminEmail) {
    await logPlatformAction({
      adminId: input.senderId,
      adminEmail: input.adminEmail,
      action: input.isInternalNote ? "ticket.internal_note" : "ticket.reply",
      resourceType: "support_tickets",
      resourceId: input.ticketId,
      details: { isInternalNote: input.isInternalNote },
    });
  }

  return newMsg;
}

/**
 * Updates ticket status, priority, or assigned operator
 */
export async function updateTicketStatus(
  ticketId: string,
  updates: {
    status?: "open" | "in_progress" | "waiting_school" | "resolved" | "closed";
    priority?: "low" | "medium" | "high" | "urgent";
    assignedTo?: string | null;
    resolutionSummary?: string;
  },
  adminEmail: string,
  adminId?: string
): Promise<{ success: boolean; ticket?: MasterAdminTicket }> {
  const ticket = mockTicketsStore.find((t) => t.id === ticketId);
  if (!ticket) {
    return { success: false };
  }

  if (updates.status) ticket.status = updates.status;
  if (updates.priority) ticket.priority = updates.priority;
  if (updates.assignedTo !== undefined) ticket.assigned_to = updates.assignedTo;
  if (updates.resolutionSummary) ticket.resolution_summary = updates.resolutionSummary;
  ticket.updated_at = new Date().toISOString();

  if (updates.status === "resolved") {
    ticket.resolution_summary = updates.resolutionSummary || "Issue resolved by support.";
  }

  if (isSupabaseConfigured) {
    try {
      await supabase
        .from("support_tickets")
        .update({
          ...updates,
          updated_at: ticket.updated_at,
        })
        .eq("id", ticketId);
    } catch {}
  }

  await logPlatformAction({
    adminId: adminId || null,
    adminEmail,
    action: "ticket.update",
    resourceType: "support_tickets",
    resourceId: ticketId,
    details: updates,
  });

  return { success: true, ticket };
}

