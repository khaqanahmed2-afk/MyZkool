import React from "react";

export const SchoolErpIllustration: React.FC = () => {
  return (
    <div className="relative w-full max-w-[340px] sm:max-w-[380px] mx-auto py-2 flex items-center justify-center select-none" aria-hidden="true">
      {/* Soft ambient backlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-[#1E5AF6]/15 via-[#00D2FF]/10 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Main SVG Vector Composition */}
      <svg
        viewBox="0 0 420 300"
        className="w-full h-auto drop-shadow-md overflow-visible"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Laptop Screen Gradient */}
          <linearGradient id="laptopScreenGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F4F8FD" />
          </linearGradient>

          {/* Laptop Body Gradient */}
          <linearGradient id="laptopBodyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Blue Button / Bar Gradient */}
          <linearGradient id="accentBlueGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1E5AF6" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          {/* Mortarboard Gradient */}
          <linearGradient id="capGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#1D4ED8" />
            <stop offset="100%" stopColor="#0F2B66" />
          </linearGradient>

          {/* Drop Shadows */}
          <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1E3A8A" floodOpacity="0.15" />
          </filter>
          <filter id="capShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#0F172A" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* ─── LAPTOP BASE & KEYBOARD ─── */}
        {/* Laptop Shadow */}
        <ellipse cx="210" cy="265" rx="150" ry="14" fill="#0F172A" fillOpacity="0.12" />

        {/* Laptop Base Plate */}
        <path
          d="M 60 252 L 360 252 C 368 252 374 256 370 262 L 362 268 C 358 271 350 272 342 272 L 78 272 C 70 272 62 271 58 268 L 50 262 C 46 256 52 252 60 252 Z"
          fill="#D1D9E6"
          stroke="#B0BED2"
          strokeWidth="1.5"
        />
        {/* Base Notch for Opening */}
        <rect x="185" y="253" width="50" height="3" rx="1.5" fill="#94A3B8" />

        {/* ─── LAPTOP SCREEN ─── */}
        {/* Outer Lid Frame */}
        <rect
          x="95"
          y="80"
          width="230"
          height="172"
          rx="12"
          fill="url(#laptopBodyGrad)"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* Inner Glass Display */}
        <rect
          x="103"
          y="88"
          width="214"
          height="156"
          rx="8"
          fill="url(#laptopScreenGrad)"
        />

        {/* Camera Dot */}
        <circle cx="210" cy="84" r="1.5" fill="#64748B" />

        {/* ─── SCREEN UI: MYZKOOL DASHBOARD ─── */}
        {/* Top App Header */}
        <rect x="103" y="88" width="214" height="18" fill="#1E5AF6" />
        <circle cx="114" cy="97" r="3" fill="#FFFFFF" fillOpacity="0.9" />
        <rect x="122" y="95" width="28" height="4" rx="2" fill="#FFFFFF" fillOpacity="0.9" />
        {/* Search bar in header */}
        <rect x="160" y="92" width="70" height="10" rx="4" fill="#FFFFFF" fillOpacity="0.25" />
        <circle cx="295" cy="97" r="4" fill="#FFFFFF" fillOpacity="0.8" />
        <circle cx="307" cy="97" r="3" fill="#38BDF8" />

        {/* Left Mini Sidebar */}
        <rect x="103" y="106" width="36" height="138" fill="#0F172A" />
        {/* Sidebar Nav Items */}
        <rect x="107" y="112" width="28" height="7" rx="3" fill="#1E5AF6" />
        <circle cx="112" cy="115.5" r="2" fill="#FFFFFF" />
        <rect x="117" y="114" width="14" height="3" rx="1.5" fill="#FFFFFF" />

        <rect x="109" y="125" width="24" height="4" rx="2" fill="#334155" />
        <rect x="109" y="134" width="24" height="4" rx="2" fill="#334155" />
        <rect x="109" y="143" width="24" height="4" rx="2" fill="#334155" />
        <rect x="109" y="152" width="24" height="4" rx="2" fill="#334155" />
        <rect x="109" y="161" width="24" height="4" rx="2" fill="#334155" />
        <rect x="109" y="170" width="24" height="4" rx="2" fill="#334155" />

        {/* Main Dashboard Canvas on Screen */}
        {/* Greeting Banner */}
        <rect x="146" y="112" width="65" height="5" rx="2" fill="#0F172A" />
        <rect x="146" y="120" width="105" height="3" rx="1.5" fill="#94A3B8" />

        {/* 3 Metric Cards */}
        {/* Card 1: Students */}
        <rect x="146" y="128" width="50" height="30" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <circle cx="156" cy="138" r="4" fill="#EFF6FF" />
        <circle cx="156" cy="138" r="2" fill="#1E5AF6" />
        <rect x="164" y="134" width="24" height="3" rx="1.5" fill="#64748B" />
        <rect x="156" y="146" width="30" height="6" rx="2" fill="#0F172A" />

        {/* Card 2: Attendance */}
        <rect x="200" y="128" width="50" height="30" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <circle cx="210" cy="138" r="4" fill="#ECFDF5" />
        <circle cx="210" cy="138" r="2" fill="#10B981" />
        <rect x="218" y="134" width="24" height="3" rx="1.5" fill="#64748B" />
        <rect x="210" y="146" width="30" height="6" rx="2" fill="#10B981" />

        {/* Card 3: Fee Collections */}
        <rect x="254" y="128" width="54" height="30" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <circle cx="264" cy="138" r="4" fill="#FFF7ED" />
        <circle cx="264" cy="138" r="2" fill="#F59E0B" />
        <rect x="272" y="134" width="24" height="3" rx="1.5" fill="#64748B" />
        <rect x="264" y="146" width="34" height="6" rx="2" fill="#F59E0B" />

        {/* Attendance Chart Widget */}
        <rect x="146" y="164" width="162" height="42" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" />
        <rect x="154" y="170" width="45" height="4" rx="2" fill="#334155" />
        {/* Bar chart bars */}
        <rect x="158" y="190" width="8" height="10" rx="2" fill="#93C5FD" />
        <rect x="174" y="184" width="8" height="16" rx="2" fill="#3B82F6" />
        <rect x="190" y="180" width="8" height="20" rx="2" fill="#1E5AF6" />
        <rect x="206" y="186" width="8" height="14" rx="2" fill="#3B82F6" />
        <rect x="222" y="178" width="8" height="22" rx="2" fill="#1E5AF6" />
        <rect x="238" y="182" width="8" height="18" rx="2" fill="#2563EB" />
        <rect x="254" y="176" width="8" height="24" rx="2" fill="#10B981" />
        <rect x="270" y="180" width="8" height="20" rx="2" fill="#10B981" />
        <rect x="286" y="174" width="8" height="26" rx="2" fill="#10B981" />

        {/* WhatsApp Notification Toast on Laptop Screen */}
        <rect x="146" y="212" width="162" height="24" rx="4" fill="#F0FDF4" stroke="#BBF7D0" strokeWidth="1" />
        <circle cx="158" cy="224" r="5" fill="#25D366" />
        <path d="M 156 224 L 157.5 225.5 L 160.5 222.5" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="168" y="219" width="70" height="4" rx="1" fill="#166534" />
        <rect x="168" y="226" width="110" height="3" rx="1" fill="#4ADE80" />

        {/* ─── POTTED PLANT BESIDE LAPTOP ─── */}
        <g transform="translate(325, 205)">
          {/* Plant Pot */}
          <path d="M 10 35 L 30 35 L 26 55 L 14 55 Z" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.5" />
          <ellipse cx="20" cy="35" rx="10" ry="3" fill="#E2E8F0" />
          {/* Succulent Leaves */}
          <path d="M 20 35 C 15 22 8 20 5 22 C 8 28 15 32 20 35 Z" fill="#10B981" />
          <path d="M 20 35 C 25 22 32 20 35 22 C 32 28 25 32 20 35 Z" fill="#059669" />
          <path d="M 20 35 C 18 16 22 16 20 12 C 18 16 19 26 20 35 Z" fill="#34D399" />
          <path d="M 20 35 C 12 30 10 15 15 15 C 18 22 19 28 20 35 Z" fill="#10B981" />
          <path d="M 20 35 C 28 30 30 15 25 15 C 22 22 21 28 20 35 Z" fill="#047857" />
        </g>

        {/* ─── HOVERING GRADUATION CAP (MORTARBOARD) ─── */}
        <g transform="translate(260, 48)" filter="url(#capShadow)">
          {/* Cap Skull Under-Cap */}
          <path
            d="M 20 38 Q 45 52 70 38 L 70 48 Q 45 64 20 48 Z"
            fill="#1E3A8A"
          />

          {/* Diamond Rhombus Board Top */}
          <path
            d="M 45 10 L 85 26 L 45 42 L 5 26 Z"
            fill="url(#capGrad)"
            stroke="#60A5FA"
            strokeWidth="1.5"
          />

          {/* Top Center Button */}
          <circle cx="45" cy="26" r="3" fill="#93C5FD" />

          {/* Golden/Blue Tassel Hanging Down */}
          <path
            d="M 45 26 Q 65 30 75 42 Q 78 52 76 60"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Tassel Fringe */}
          <rect x="73" y="58" width="6" height="8" rx="2" fill="#F59E0B" />
        </g>

        {/* ─── FLOATING CIRCULAR BADGES ─── */}
        {/* 1. TOP-LEFT: Calendar Badge (Blue) */}
        <g transform="translate(130, 60)" filter="url(#badgeShadow)">
          <circle cx="16" cy="16" r="16" fill="#1E5AF6" />
          {/* Calendar Icon */}
          <rect x="8" y="9" width="16" height="14" rx="3" fill="#FFFFFF" />
          <rect x="8" y="9" width="16" height="4" fill="#3B82F6" />
          <rect x="11" y="7" width="2" height="3" rx="1" fill="#FFFFFF" />
          <rect x="19" y="7" width="2" height="3" rx="1" fill="#FFFFFF" />
          <circle cx="12" cy="17" r="1" fill="#1E5AF6" />
          <circle cx="16" cy="17" r="1" fill="#1E5AF6" />
          <circle cx="20" cy="17" r="1" fill="#1E5AF6" />
        </g>

        {/* 2. TOP-RIGHT: Students / Graduate Badge (Green) */}
        <g transform="translate(345, 75)" filter="url(#badgeShadow)">
          <circle cx="16" cy="16" r="16" fill="#10B981" />
          {/* Users / Student Icon */}
          <circle cx="16" cy="12" r="3.5" fill="#FFFFFF" />
          <path d="M 9 22 C 9 18 12 17 16 17 C 20 17 23 18 23 22" fill="#FFFFFF" />
        </g>

        {/* 3. LEFT-MIDDLE: Document / Report Badge (Cyan) */}
        <g transform="translate(110, 150)" filter="url(#badgeShadow)">
          <circle cx="16" cy="16" r="16" fill="#0284C7" />
          {/* Document Icon */}
          <rect x="10" y="8" width="12" height="16" rx="2" fill="#FFFFFF" />
          <rect x="13" y="11" width="6" height="1.5" rx="0.5" fill="#0284C7" />
          <rect x="13" y="14" width="6" height="1.5" rx="0.5" fill="#0284C7" />
          <rect x="13" y="17" width="4" height="1.5" rx="0.5" fill="#0284C7" />
        </g>

        {/* 4. RIGHT-MIDDLE: Analytics / Growth Badge (Cobalt Blue) */}
        <g transform="translate(348, 158)" filter="url(#badgeShadow)">
          <circle cx="16" cy="16" r="16" fill="#2563EB" />
          {/* Bar Chart Icon */}
          <rect x="10" y="16" width="3" height="7" rx="1" fill="#FFFFFF" />
          <rect x="14.5" y="12" width="3" height="11" rx="1" fill="#FFFFFF" />
          <rect x="19" y="8" width="3" height="15" rx="1" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
};

export default SchoolErpIllustration;
