import React, { useState } from "react";
import { Users, Phone, CheckCircle2, AlertCircle, Home, Link2, MapPin } from "lucide-react";
import { AdmissionWizardPayload, ParentInput, StudentAddressInput } from "../../../../types/students";
import { lookupParentByPhone } from "../../../../services/studentService";

interface Step2Props {
  schoolId: string;
  data: AdmissionWizardPayload["step2_guardian"];
  onChange: (fields: Partial<AdmissionWizardPayload["step2_guardian"]>) => void;
  errors: Record<string, string>;
}

type ParentType = "father" | "mother" | "guardian";

export const StudentWizardStep2Guardian: React.FC<Step2Props> = ({
  schoolId,
  data,
  onChange,
  errors,
}) => {
  const [phoneLookupState, setPhoneLookupState] = useState<Record<string, {
    found: boolean;
    parentName?: string;
    childDetails?: string;
    linked: boolean;
  }>>({});

  const handlePhoneBlur = async (type: ParentType, phone: string) => {
    const clean = phone.replace(/\D/g, "").slice(-10);
    if (clean.length === 10) {
      const res = await lookupParentByPhone(schoolId, clean);
      if (res.found && res.parent) {
        const childInfo = res.linked_students?.length
          ? `${res.linked_students[0].first_name} (${res.linked_students[0].class_name || "Enrolled"})`
          : "Sibling enrolled";
        setPhoneLookupState((prev) => ({
          ...prev,
          [type]: {
            found: true,
            parentName: res.parent?.full_name,
            childDetails: childInfo,
            linked: false,
          },
        }));
      } else {
        setPhoneLookupState((prev) => ({
          ...prev,
          [type]: { found: false, linked: false },
        }));
      }
    }
  };

  const handleLinkParent = (type: ParentType) => {
    const lookup = phoneLookupState[type];
    if (lookup?.found && lookup.parentName) {
      updateParent(type, {
        full_name: lookup.parentName,
      });
      setPhoneLookupState((prev) => ({
        ...prev,
        [type]: { ...lookup, linked: true },
      }));
    }
  };

  const updateParent = (
    type: ParentType,
    fields: Partial<ParentInput & { relation: any; is_primary_contact?: boolean; whatsapp_consent?: boolean }>
  ) => {
    const current = data[type] || {
      full_name: "",
      phone: "",
      relation: type,
      whatsapp_consent: true,
    };
    onChange({
      [type]: { ...current, ...fields },
    });
  };

  const setPrimaryContact = (type: ParentType) => {
    const updated = { ...data };
    if (updated.father) updated.father.is_primary_contact = type === "father";
    if (updated.mother) updated.mother.is_primary_contact = type === "mother";
    if (updated.guardian) updated.guardian.is_primary_contact = type === "guardian";
    onChange(updated);
  };

  const renderParentCard = (
    type: ParentType,
    title: string,
    isRequired: boolean
  ) => {
    const pData = data[type] || {
      full_name: "",
      phone: "",
      relation: type,
      whatsapp_consent: true,
    };
    const lookup = phoneLookupState[type];
    const isPrimary = pData.is_primary_contact || (type === "father" && !data.mother?.is_primary_contact);

    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#2158E0]" />
            <h3 className="font-semibold text-slate-900 text-sm">{title}</h3>
            {isRequired && <span className="text-red-500 text-xs">*</span>}
          </div>
          <label htmlFor={`primary-contact-${type}`} className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
            <input
              id={`primary-contact-${type}`}
              type="radio"
              name="primary_contact"
              checked={isPrimary}
              onChange={() => setPrimaryContact(type)}
              className="text-[#2158E0] focus:ring-[#2158E0]"
            />
            <span>Primary Contact</span>
          </label>
        </div>

        {/* Phone number FIRST */}
        <div>
          <label htmlFor={`guardian-${type}-phone`} className="block text-xs font-medium text-slate-700 mb-1">
            Mobile Phone Number {isRequired && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 text-xs font-semibold">
              +91
            </div>
            <input
              id={`guardian-${type}-phone`}
              type="tel"
              value={pData.phone || ""}
              maxLength={10}
              onChange={(e) => {
                const numericOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                updateParent(type, { phone: numericOnly });
              }}
              onBlur={() => handlePhoneBlur(type, pData.phone)}
              placeholder="10-digit mobile number"
              className="w-full pl-10 pr-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Used for student updates, attendance and parent login.</p>
        </div>

        {/* Existing Parent Found Banner */}
        {lookup?.found && !lookup.linked && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-900">
              <Link2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Existing parent found: <strong>{lookup.parentName}</strong> ({lookup.childDetails})
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleLinkParent(type)}
                className="px-2.5 py-1 bg-[#2158E0] text-white rounded font-medium hover:bg-blue-700 text-xs shadow-2xs"
              >
                Link Parent
              </button>
              <button
                type="button"
                onClick={() => setPhoneLookupState((prev) => ({ ...prev, [type]: { ...lookup, linked: true } }))}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium"
              >
                Different Person
              </button>
            </div>
          </div>
        )}

        {/* Full Name */}
        <div>
          <label htmlFor={`guardian-${type}-fullname`} className="block text-xs font-medium text-slate-700 mb-1">
            Full Name {isRequired && <span className="text-red-500">*</span>}
          </label>
          <input
            id={`guardian-${type}-fullname`}
            type="text"
            value={pData.full_name || ""}
            onChange={(e) => updateParent(type, { full_name: e.target.value })}
            placeholder={`Enter ${title.toLowerCase()}'s full name`}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        {/* Email & Occupation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor={`guardian-${type}-email`} className="block text-xs font-medium text-slate-700 mb-1">
              Email Address
            </label>
            <input
              id={`guardian-${type}-email`}
              type="email"
              value={pData.email || ""}
              onChange={(e) => updateParent(type, { email: e.target.value })}
              placeholder="e.g. parent@example.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
          <div>
            <label htmlFor={`guardian-${type}-occupation`} className="block text-xs font-medium text-slate-700 mb-1">
              Occupation
            </label>
            <input
              id={`guardian-${type}-occupation`}
              type="text"
              value={pData.occupation || ""}
              onChange={(e) => updateParent(type, { occupation: e.target.value })}
              placeholder="e.g. Engineer, Business, Homemaker"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
        </div>

        {/* WhatsApp Consent */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <input
            type="checkbox"
            id={`whatsapp_${type}`}
            checked={pData.whatsapp_consent !== false}
            onChange={(e) => updateParent(type, { whatsapp_consent: e.target.checked })}
            className="rounded text-[#1FAE7A] focus:ring-[#1FAE7A]"
          />
          <label htmlFor={`whatsapp_${type}`} className="text-xs text-slate-700 font-medium">
            Agrees to receive fee, attendance and school announcements on WhatsApp
          </label>
        </div>
      </div>
    );
  };

  const updatePermanentAddress = (fields: Partial<StudentAddressInput>) => {
    const current = data.permanent_address || {
      kind: "permanent",
      line1: "",
      city: "",
      district: "",
      state: "Uttar Pradesh",
      pin: "",
    };
    onChange({
      permanent_address: { ...current, ...fields },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Step 2: Guardian & Family</h2>
        <p className="text-sm text-slate-500 mt-1">
          Phone lookup detects existing parents and links siblings automatically.
        </p>
      </div>

      {errors.guardian && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errors.guardian}</span>
        </div>
      )}

      {/* 3 Cards: Father, Mother, Guardian */}
      <div className="space-y-4">
        {renderParentCard("father", "Father", true)}
        {renderParentCard("mother", "Mother", false)}
        {renderParentCard("guardian", "Legal Guardian (if applicable)", false)}
      </div>

      {/* Address Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
          <Home className="w-4 h-4 text-[#2158E0]" />
          <h3 className="font-semibold text-slate-900 text-sm">Current Residential Address</h3>
        </div>

        {errors.address && (
          <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.address}</span>
          </div>
        )}

        <div>
          <label htmlFor="address-line1" className="block text-xs font-medium text-slate-700 mb-1">
            Address Line 1 <span className="text-red-500">*</span>
          </label>
          <input
            id="address-line1"
            type="text"
            value={data.current_address.line1 || ""}
            onChange={(e) =>
              onChange({
                current_address: { ...data.current_address, line1: e.target.value },
              })
            }
            placeholder="House / Flat No., Building name, Street"
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label htmlFor="address-landmark" className="block text-xs font-medium text-slate-700 mb-1">
              Landmark
            </label>
            <input
              id="address-landmark"
              type="text"
              value={data.current_address.landmark || ""}
              onChange={(e) =>
                onChange({
                  current_address: { ...data.current_address, landmark: e.target.value },
                })
              }
              placeholder="Nearest landmark (helps bus route mapping)"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
          <div>
            <label htmlFor="address-pin" className="block text-xs font-medium text-slate-700 mb-1">
              PIN Code <span className="text-red-500">*</span>
            </label>
            <input
              id="address-pin"
              type="text"
              value={data.current_address.pin || ""}
              maxLength={6}
              onChange={(e) =>
                onChange({
                  current_address: { ...data.current_address, pin: e.target.value.replace(/\D/g, "").slice(0, 6) },
                })
              }
              placeholder="6-digit PIN code"
              className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label htmlFor="address-city" className="block text-xs font-medium text-slate-700 mb-1">
              City / Town <span className="text-red-500">*</span>
            </label>
            <input
              id="address-city"
              type="text"
              value={data.current_address.city || ""}
              onChange={(e) =>
                onChange({
                  current_address: { ...data.current_address, city: e.target.value },
                })
              }
              placeholder="e.g. Lucknow"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
          <div>
            <label htmlFor="address-district" className="block text-xs font-medium text-slate-700 mb-1">
              District
            </label>
            <input
              id="address-district"
              type="text"
              value={data.current_address.district || ""}
              onChange={(e) =>
                onChange({
                  current_address: { ...data.current_address, district: e.target.value },
                })
              }
              placeholder="e.g. Lucknow"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
          <div>
            <label htmlFor="address-state" className="block text-xs font-medium text-slate-700 mb-1">
              State
            </label>
            <input
              id="address-state"
              type="text"
              value={data.current_address.state || "Uttar Pradesh"}
              onChange={(e) =>
                onChange({
                  current_address: { ...data.current_address, state: e.target.value },
                })
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
            />
          </div>
        </div>

        {/* Same as Current Address Checkbox */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <input
            type="checkbox"
            id="same_as_current"
            checked={data.same_as_current !== false}
            onChange={(e) => {
              const checked = e.target.checked;
              onChange({
                same_as_current: checked,
                permanent_address: checked ? undefined : (data.permanent_address || { ...data.current_address, kind: "permanent" }),
              });
            }}
            className="rounded text-[#2158E0] focus:ring-[#2158E0]"
          />
          <label htmlFor="same_as_current" className="text-xs text-slate-800 font-medium">
            Permanent address is the same as current residential address
          </label>
        </div>

        {/* Permanent Address Fields (conditionally rendered when same_as_current is false) */}
        {!data.same_as_current && (
          <div className="pt-4 mt-2 border-t border-slate-200 space-y-4 bg-slate-50/70 p-4 rounded-xl">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#2158E0]" />
              <h4 className="font-semibold text-slate-900 text-xs uppercase tracking-wider">
                Permanent Address Details
              </h4>
            </div>

            <div>
              <label htmlFor="permanent-address-line1" className="block text-xs font-medium text-slate-700 mb-1">
                Permanent Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                id="permanent-address-line1"
                type="text"
                value={data.permanent_address?.line1 || ""}
                onChange={(e) => updatePermanentAddress({ line1: e.target.value })}
                placeholder="House / Flat No., Village, Post Office"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label htmlFor="permanent-address-landmark" className="block text-xs font-medium text-slate-700 mb-1">
                  Landmark
                </label>
                <input
                  id="permanent-address-landmark"
                  type="text"
                  value={data.permanent_address?.landmark || ""}
                  onChange={(e) => updatePermanentAddress({ landmark: e.target.value })}
                  placeholder="Nearest landmark"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>
              <div>
                <label htmlFor="permanent-address-pin" className="block text-xs font-medium text-slate-700 mb-1">
                  PIN Code <span className="text-red-500">*</span>
                </label>
                <input
                  id="permanent-address-pin"
                  type="text"
                  value={data.permanent_address?.pin || ""}
                  maxLength={6}
                  onChange={(e) => updatePermanentAddress({ pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  placeholder="6-digit PIN code"
                  className="w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label htmlFor="permanent-address-city" className="block text-xs font-medium text-slate-700 mb-1">
                  City / Town / Village <span className="text-red-500">*</span>
                </label>
                <input
                  id="permanent-address-city"
                  type="text"
                  value={data.permanent_address?.city || ""}
                  onChange={(e) => updatePermanentAddress({ city: e.target.value })}
                  placeholder="e.g. Varanasi"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>
              <div>
                <label htmlFor="permanent-address-district" className="block text-xs font-medium text-slate-700 mb-1">
                  District
                </label>
                <input
                  id="permanent-address-district"
                  type="text"
                  value={data.permanent_address?.district || ""}
                  onChange={(e) => updatePermanentAddress({ district: e.target.value })}
                  placeholder="e.g. Varanasi"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>
              <div>
                <label htmlFor="permanent-address-state" className="block text-xs font-medium text-slate-700 mb-1">
                  State
                </label>
                <input
                  id="permanent-address-state"
                  type="text"
                  value={data.permanent_address?.state || "Uttar Pradesh"}
                  onChange={(e) => updatePermanentAddress({ state: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#2158E0]"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
