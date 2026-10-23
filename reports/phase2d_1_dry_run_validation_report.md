# MyZkool Phase 2D.1: Historical Financial Repair Validation & Dry-Run Report

**Date & Time**: 2026-10-17 16:15 IST  
**Environment**: Production Database (`nzphjfsgtkbvfrevduek`) — PostgreSQL Live  
**Target School**: Peace Convent School (`b70261ef-37f1-46c8-a148-2c496a9d33a8`)  
**Execution Mode**: **READ-ONLY DRY RUN ONLY** (Zero rows permanently updated or inserted)  
**Status**: **VALIDATED & AWAITING EXPLICIT HUMAN APPROVAL**  

---

## 1. Executive Summary & Verification

This validation phase audited and verified the proposed historical repair SQL against the live database, strictly adhering to the read-only safety rules:
1. **Transaction Safety**: Crafted canonical SQL script `supabase/scripts/phase2d_historical_repair.sql` with `BEGIN ... ROLLBACK;` as the default non-destructive execution guard.
2. **Explicit Scoping by Exact Assignment ID (`source_ref`)**: Ensured all transport operations join strictly on `ta.id = sd.source_ref AND ta.school_id = sd.school_id`, eliminating reliance on student ID alone.
3. **Exact Records Verified**: Exactly 74 doubled transport dues (-₹72,400) and 6 pre-enrollment transport dues (-₹4,800) were validated using primary keys, assignment IDs, term date boundaries, and effective dates.
4. **Append-Only Idempotent Ledger Adjustments**: Created 74 ledger adjustment entries guarded with `NOT EXISTS` to prevent duplicate adjustments upon retries.
5. **Scoped Structure Ledger Backfills**: Backfilled exactly 104 pending structure dues (+₹1,79,600) and 143 RTE waived structure dues (+₹2,17,400 due_created, -₹2,17,400 concession) in Peace Convent School, strictly excluding the 80 legacy test tenant records.
6. **Zero Phantom Ledger Entries for Pre-Enrollment Dues**: Confirmed that the 6 cancelled pre-enrollment dues generate zero ledger entries.
7. **Comprehensive Point-in-Time Recovery**: Verified `scripts/backups/phase2b_financial_backup_pre.json` and built `scripts/recover_financial_tables.cjs`, which compiles a 515-line SQL restore script.

---

## 2. Live Database Record Count & Financial Metric Verification

| Entity / Category | Exact Live Count | Current Persisted Value | Proposed Adjustment | Post-Correction Expected |
| :--- | :--- | :--- | :--- | :--- |
| **Transport Dues: Doubled by Month Overlap** | **74 dues** | ₹1,44,800.00 (14,480,000 paise) | -₹72,400.00 (-7,240,000 paise) | **₹72,400.00 (7,240,000 paise)** |
| **Transport Dues: Pre-Enrollment Billing** | **6 dues** | ₹4,800.00 (480,000 paise) | -₹4,800.00 (-480,000 paise) | **₹0.00 (Cancelled)** |
| **Transport Dues: Baseline Correct** | **10 dues** | ₹9,200.00 (920,000 paise) | ₹0.00 | **₹9,200.00 (920,000 paise)** |
| **Total Transport Dues Demand** | **90 dues** | **₹1,58,800.00 (15,880,000 paise)**| **-₹77,200.00 (-7,720,000 paise)**| **₹81,600.00 (8,160,000 paise)** |
| **Structure Dues: Pending (Unsynchronized)**| **104 dues**| ₹1,79,600.00 (17,960,000 paise) | Backfill due_created | **₹1,79,600.00 (17,960,000 paise)**|
| **Structure Dues: RTE Waived (Unsynchronized)**| **143 dues**| ₹2,17,400.00 (21,740,000 paise) | Backfill due + concession | **₹0.00 Net (0 paise)** |
| **Total Structure Dues Demand** | **247 dues**| **₹3,97,000.00 (39,700,000 paise)**| **Backfill Ledger Only** | **₹1,79,600.00 Net (17,960,000 paise)**|
| **Total Student Dues in Target School** | **337 dues**| **₹5,55,800.00 Gross / ₹3,38,400 Net**| **-₹77,200.00 Net Dues Demand**| **₹4,78,600 Gross / ₹2,61,200 Net** |

---

## 3. Itemized Schedule of the 74 Doubled Transport Dues

Each record was verified using its exact `due_id`, `assignment_id` (`source_ref`), term dates, and effective start date:

| Due ID | Assignment ID (`source_ref`) | Admission No | Student Name | Term | Term Dates | Effective From | Old Gross | Proposed Gross | Proposed Ledger Adjustment |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `54009d28-e2af-4bea-907e-e2035acce21d` | `9906569e-afd6-467d-b546-81d10aba6e07` | ADM-2026-0009 | Aarohi Saini | November 2026 | 2026-10-31 to 2026-11-29 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `e538fd2a-5837-4f82-950e-550771236612` | `9906569e-afd6-467d-b546-81d10aba6e07` | ADM-2026-0009 | Aarohi Saini | December 2026 | 2026-11-30 to 2026-12-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `b61cbcb9-426e-4b09-86cd-328242e9a818` | `9906569e-afd6-467d-b546-81d10aba6e07` | ADM-2026-0009 | Aarohi Saini | January 2027 | 2026-12-31 to 2027-01-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `8de75750-9c36-43b9-9c56-697ace6632ae` | `9906569e-afd6-467d-b546-81d10aba6e07` | ADM-2026-0009 | Aarohi Saini | February 2027 | 2027-01-31 to 2027-02-27 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `2f6b95ff-8f1c-4d05-adef-aeebe998a925` | `9906569e-afd6-467d-b546-81d10aba6e07` | ADM-2026-0009 | Aarohi Saini | March 2027 | 2027-02-28 to 2027-03-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `c58e9d77-df3b-4a45-bdaf-13e7b8c6338b` | `f086c193-603f-4a98-8f2a-4dab549619ef` | ADM-2026-0010 | Aadhya Sharma | November 2026 | 2026-10-31 to 2026-11-29 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `a6b0cd9c-ec89-4166-9569-40236bd698a1` | `f086c193-603f-4a98-8f2a-4dab549619ef` | ADM-2026-0010 | Aadhya Sharma | December 2026 | 2026-11-30 to 2026-12-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `6a24fee9-3911-4832-a5ee-2501b9674474` | `f086c193-603f-4a98-8f2a-4dab549619ef` | ADM-2026-0010 | Aadhya Sharma | January 2027 | 2026-12-31 to 2027-01-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `75d101ed-293d-43e3-b44c-6127227e5ecd` | `f086c193-603f-4a98-8f2a-4dab549619ef` | ADM-2026-0010 | Aadhya Sharma | February 2027 | 2027-01-31 to 2027-02-27 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `d281ea16-281d-4f5c-b7cd-19003056d3a7` | `f086c193-603f-4a98-8f2a-4dab549619ef` | ADM-2026-0010 | Aadhya Sharma | March 2027 | 2027-02-28 to 2027-03-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `87a92696-b181-4973-8190-687121c668e9` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | May 2026 | 2026-04-30 to 2026-05-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `7370bedd-4a77-43b6-8742-dfea387f5856` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | June 2026 | 2026-05-31 to 2026-06-29 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `d238ca30-f850-4de1-a001-1eda48d8a0bf` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | July 2026 | 2026-06-30 to 2026-07-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `d842a5c6-af3e-465c-a4fb-8a786cf1ea87` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | August 2026 | 2026-07-31 to 2026-08-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `1750f227-ba28-4d4b-8376-8703917834c8` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | September 2026 | 2026-08-31 to 2026-09-29 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `3d353dc7-8ac8-418d-8189-5c298df5bed7` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | October 2026 | 2026-09-30 to 2026-10-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `628ab4b1-fb3d-47a3-b79f-23ee0ae8d587` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | November 2026 | 2026-10-31 to 2026-11-29 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `adc13410-9522-421b-9206-22008bab241e` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | December 2026 | 2026-11-30 to 2026-12-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `47f39a56-52e2-4a00-9450-569c508b85d1` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | January 2027 | 2026-12-31 to 2027-01-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `617c599a-28bb-4deb-b885-bb217a504ba8` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | February 2027 | 2027-01-31 to 2027-02-27 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `69af07e2-e384-4015-90b3-c2935b2dc3b5` | `228e31d4-21f4-412c-9221-6b3492276e99` | ADM-2026-0016 | Ira Roy | March 2027 | 2027-02-28 to 2027-03-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `f4d9a9ac-4c4a-4755-897f-4c5929b49a96` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | May 2026 | 2026-04-30 to 2026-05-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `4c475d77-f39e-4b7b-824f-81acd9a229e1` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | June 2026 | 2026-05-31 to 2026-06-29 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `aed04fb7-c138-486b-8beb-738e7eef58eb` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | July 2026 | 2026-06-30 to 2026-07-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `a06a2b4b-288d-45ca-8f73-517415066884` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | August 2026 | 2026-07-31 to 2026-08-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `720e6c8b-0d0f-4175-8560-b70718e5a0b8` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | September 2026 | 2026-08-31 to 2026-09-29 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `4c12e882-b550-43b9-b453-5e6bcca6a95e` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | October 2026 | 2026-09-30 to 2026-10-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `45a88651-5daa-4eb9-a2e4-c126b834ec1c` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | November 2026 | 2026-10-31 to 2026-11-29 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `2a5b6ead-d2c6-4da6-8afa-13de7819f9c2` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | December 2026 | 2026-11-30 to 2026-12-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `4c50b24c-3d28-4b6f-a2a2-8df19c96712d` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | January 2027 | 2026-12-31 to 2027-01-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `150824a3-a078-46d7-9860-f9933690d41d` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | February 2027 | 2027-01-31 to 2027-02-27 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `afcc57b3-4381-41b1-ad93-7b1a10eeb8bf` | `e3568f0d-3177-4172-9474-4595991220d8` | ADM-2026-0031 | Kunal Singh | March 2027 | 2027-02-28 to 2027-03-30 | 2026-04-01 | ₹2000.00 | **₹1000.00** | **-₹1000.00** |
| `93a374f4-fb4b-4c55-b2b0-481b07e27a7e` | `2185b41e-3a3e-43b0-a087-15d3e8cb4cec` | ADM-2026-0037 | Aadhya Choudhary | November 2026 | 2026-10-31 to 2026-11-29 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `a4716e31-1899-4c93-bde4-bdbca92a95ec` | `2185b41e-3a3e-43b0-a087-15d3e8cb4cec` | ADM-2026-0037 | Aadhya Choudhary | December 2026 | 2026-11-30 to 2026-12-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `8c4dd8e5-fed3-4668-b249-3d96abe904b9` | `2185b41e-3a3e-43b0-a087-15d3e8cb4cec` | ADM-2026-0037 | Aadhya Choudhary | January 2027 | 2026-12-31 to 2027-01-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `80514d9d-efea-4f31-8db1-c04d8f62fc77` | `2185b41e-3a3e-43b0-a087-15d3e8cb4cec` | ADM-2026-0037 | Aadhya Choudhary | February 2027 | 2027-01-31 to 2027-02-27 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `b89d8e32-32a8-4202-8d57-290604e219fa` | `2185b41e-3a3e-43b0-a087-15d3e8cb4cec` | ADM-2026-0037 | Aadhya Choudhary | March 2027 | 2027-02-28 to 2027-03-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `7c126024-67b1-44e7-b8b7-a19a7a8a8e34` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | May 2026 | 2026-04-30 to 2026-05-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `f3197c0e-1c24-45fa-8b84-0f46c640e0af` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | June 2026 | 2026-05-31 to 2026-06-29 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `dd1c9540-2c4a-4611-b2a1-ebc7f9b70ae8` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | July 2026 | 2026-06-30 to 2026-07-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `0abc2031-9d48-463b-b432-f38756135dcb` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | August 2026 | 2026-07-31 to 2026-08-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `d9f46ac5-0a65-43c9-adb2-312c25ac26d0` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | September 2026 | 2026-08-31 to 2026-09-29 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `7efc2dfe-e778-4099-bd96-4843da562a0c` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | October 2026 | 2026-09-30 to 2026-10-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `ec1caa29-732e-4a1a-9217-0578082a1cad` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | November 2026 | 2026-10-31 to 2026-11-29 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `9e54ee56-a40c-4c44-a278-a45440d1804c` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | December 2026 | 2026-11-30 to 2026-12-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `924163e9-30d0-4f03-9212-3c3767da8aca` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | January 2027 | 2026-12-31 to 2027-01-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `90d21b8c-46de-4ac3-8b7e-e22488efefc2` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | February 2027 | 2027-01-31 to 2027-02-27 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `fde010a4-048a-4b03-9ba9-d3c04221bd97` | `3abedae5-6d58-4adc-8769-93346cd8d1d4` | ADM-2026-0061 | Abhishek Agarwal | March 2027 | 2027-02-28 to 2027-03-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `f84b151c-f9de-4942-ab78-547232a55b00` | `e6e560d2-bfca-4ad6-be61-2e003fa106cb` | ADM-2026-0068 | Aarohi Bhardwaj | November 2026 | 2026-10-31 to 2026-11-29 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `1e8fa744-2437-4a8c-abf6-32b4e62aa809` | `e6e560d2-bfca-4ad6-be61-2e003fa106cb` | ADM-2026-0068 | Aarohi Bhardwaj | December 2026 | 2026-11-30 to 2026-12-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `d1a85ac7-0430-496f-acfa-7e06592f99d5` | `e6e560d2-bfca-4ad6-be61-2e003fa106cb` | ADM-2026-0068 | Aarohi Bhardwaj | January 2027 | 2026-12-31 to 2027-01-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `66ad0fe1-2e80-4e71-bea5-26bc50e5ae3f` | `e6e560d2-bfca-4ad6-be61-2e003fa106cb` | ADM-2026-0068 | Aarohi Bhardwaj | February 2027 | 2027-01-31 to 2027-02-27 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `8429a659-e94f-4139-8c66-59dfbb133504` | `e6e560d2-bfca-4ad6-be61-2e003fa106cb` | ADM-2026-0068 | Aarohi Bhardwaj | March 2027 | 2027-02-28 to 2027-03-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `679f6e19-f505-4047-b57c-de60cb8c7dde` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | November 2026 | 2026-10-31 to 2026-11-29 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `f8b449b2-f7f7-47b5-939b-5f18969e836c` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | December 2026 | 2026-11-30 to 2026-12-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `6946a434-c7ad-4e5a-944c-f1ef70716e0f` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | January 2027 | 2026-12-31 to 2027-01-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `d30d773b-6811-41e4-9451-82eeca248f83` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | February 2027 | 2027-01-31 to 2027-02-27 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `0c974e0a-bae0-4f7d-811e-41b354514df7` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | March 2027 | 2027-02-28 to 2027-03-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `7a7a7d57-12c4-493b-9a0d-803209c3924d` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | May 2026 | 2026-04-30 to 2026-05-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `37d1fd89-4700-4183-87ad-86ddec7c1e3c` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | June 2026 | 2026-05-31 to 2026-06-29 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `dc3c073a-3d9a-4741-81a6-70d255b7f62a` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | July 2026 | 2026-06-30 to 2026-07-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `7fce04f8-b7ef-413e-bdb7-0c19e7a3bd3e` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | August 2026 | 2026-07-31 to 2026-08-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `57fea092-2c12-4ca9-983d-1e478f04e383` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | September 2026 | 2026-08-31 to 2026-09-29 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `c04b3c29-b701-4554-8119-bb2bda2704f3` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | October 2026 | 2026-09-30 to 2026-10-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `2af11e2f-f44b-4db1-b3e1-eadd9ad80684` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | November 2026 | 2026-10-31 to 2026-11-29 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `3d32e35b-9bab-4235-943c-f03eed0b9b78` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | December 2026 | 2026-11-30 to 2026-12-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `6f0fb2fd-1853-458e-a11e-68835b7eee20` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | January 2027 | 2026-12-31 to 2027-01-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `816e37a0-63af-4e69-91f5-6f245c1878d1` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | February 2027 | 2027-01-31 to 2027-02-27 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `7765bf80-1363-4989-a090-637440ed6a6d` | `5b36eac7-1222-4c98-b2a3-7a79e42ad383` | ADM-2026-0091 | Diya Bhardwaj | March 2027 | 2027-02-28 to 2027-03-30 | 2026-04-01 | ₹2400.00 | **₹1200.00** | **-₹1200.00** |
| `d1790b6e-67e0-4041-829a-874d85542371` | `f0ced34b-d9d6-444a-82d9-58023b86d6d9` | ADM-2026-0098 | Aadhya Patel | November 2026 | 2026-10-31 to 2026-11-29 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `01d55f7d-0ce7-4593-9d91-49ec19df95dd` | `f0ced34b-d9d6-444a-82d9-58023b86d6d9` | ADM-2026-0098 | Aadhya Patel | December 2026 | 2026-11-30 to 2026-12-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `09327627-e49c-482d-ba6c-5da94a86bc52` | `f0ced34b-d9d6-444a-82d9-58023b86d6d9` | ADM-2026-0098 | Aadhya Patel | January 2027 | 2026-12-31 to 2027-01-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `55f6c3ea-e675-4625-b3b3-934eacc118b5` | `f0ced34b-d9d6-444a-82d9-58023b86d6d9` | ADM-2026-0098 | Aadhya Patel | February 2027 | 2027-01-31 to 2027-02-27 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |
| `edcc565a-4a75-490e-af13-900f0f1686f3` | `f0ced34b-d9d6-444a-82d9-58023b86d6d9` | ADM-2026-0098 | Aadhya Patel | March 2027 | 2027-02-28 to 2027-03-30 | 2026-10-16 | ₹1600.00 | **₹800.00** | **-₹800.00** |

---

## 4. Itemized Schedule of the 6 Pre-Enrollment Transport Dues

All 6 dues belong to student Aanya Choudhary (`ADM-2026-0074`) for term dates that ended before her transport enrollment on `2026-10-16`. Zero ledger entries will be inserted for these dues.

| Due ID | Assignment ID (`source_ref`) | Admission No | Student Name | Term | Term Dates | Effective From | Old Gross | Proposed Gross | Old Status | Proposed Status | Ledger Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `1163d007-4df2-45c8-9a1d-fa2e5280114e` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | April 2026 | 2026-03-31 to 2026-04-29 | 2026-10-16 | ₹800.00 | **₹0.00** | pending | **cancelled** | **0 entries** |
| `ed61aef6-7ed5-404b-a140-a0698f942a41` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | May 2026 | 2026-04-30 to 2026-05-30 | 2026-10-16 | ₹800.00 | **₹0.00** | pending | **cancelled** | **0 entries** |
| `70a5fe1d-74c1-4869-a96b-48373502aa2b` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | June 2026 | 2026-05-31 to 2026-06-29 | 2026-10-16 | ₹800.00 | **₹0.00** | pending | **cancelled** | **0 entries** |
| `e06b633e-8bf2-41d1-ba64-b3f45b5e155a` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | July 2026 | 2026-06-30 to 2026-07-30 | 2026-10-16 | ₹800.00 | **₹0.00** | pending | **cancelled** | **0 entries** |
| `ac093eb2-b153-4ebe-8339-34329d1d9351` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | August 2026 | 2026-07-31 to 2026-08-30 | 2026-10-16 | ₹800.00 | **₹0.00** | pending | **cancelled** | **0 entries** |
| `ceb18229-db97-4306-9628-cb7171e448da` | `c4fd5117-b459-4630-b48f-4674aa81d5e6` | ADM-2026-0074 | Aanya Choudhary | September 2026 | 2026-08-31 to 2026-09-29 | 2026-10-16 | ₹800.00 | **₹0.00** | pending | **cancelled** | **0 entries** |

---

## 5. Scope Verification: Structure Dues Ledger Backfill

The structure ledger backfill is strictly restricted to Peace Convent School (`b70261ef-37f1-46c8-a148-2c496a9d33a8`):
- **104 Pending Structure Dues**:
  - Gross: ₹1,79,600.00 (17,960,000 paise)
  - Concession: ₹0.00
  - Net: ₹1,79,600.00 (17,960,000 paise)
  - Backfill Action: Insert 104 `due_created` entries.
- **143 Waived Structure Dues (RTE 100% Scholarship)**:
  - Gross: ₹2,17,400.00 (21,740,000 paise)
  - Concession: ₹2,17,400.00 (21,740,000 paise)
  - Net: ₹0.00
  - Backfill Action: Insert 143 `due_created` entries (+₹2,17,400) and 143 `concession` entries (-₹2,17,400).
  - Net ledger impact on student balance: Exactly ₹0.00.
- **Excluded Legacy Tenant (`33a509da-9f79-44c0-ad71-372916d04925`)**:
  - Exactly 80 pending structure dues for 4 legacy test students (`ADM-2026-0139` to `ADM-2026-0143`) are completely excluded by the `sd.school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8'` filter.

---

## 6. End-to-End Financial Balance Reconciliation

### Comparison of Student Dues vs. Fee Ledger Post-Correction

| Component | Student Dues Module (Demand) | Fee Ledger Module (Accounting) | Variance | Financial Reason |
| :--- | :--- | :--- | :--- | :--- |
| **Transport Dues Demand** | ₹81,600.00 (8,160,000 paise) | ₹81,600.00 (8,160,000 paise) | ₹0.00 | 84 original due_created minus 74 adjustments |
| **Active Structure Dues Demand**| ₹1,79,600.00 (17,960,000 paise) | ₹1,79,600.00 (17,960,000 paise) | ₹0.00 | 104 backfilled due_created entries |
| **RTE Waived Dues Demand** | ₹0.00 Net (0 paise) | ₹0.00 Net (0 paise) | ₹0.00 | 143 gross minus 143 concessions |
| **Direct Payments on Dues** | ₹0.00 | ₹0.00 | ₹0.00 | No dues have direct payments applied |
| **Unallocated Advance Credit** | — | -₹1,000.00 (-100,000 paise) | -₹1,000.00 | Ira Roy Receipt #MZ/2026–2027/000002 |
| **Reversed / Cancelled Payments**| — | ₹0.00 (-₹500 payment + ₹500 reversal)| ₹0.00 | Abhishek Agarwal Receipt #3 |
| **TOTALS** | **₹2,61,200.00 (26,120,000 paise)**| **₹2,60,200.00 (26,020,000 paise)**| **-₹1,000.00**| **100% RECONCILED WITH ADVANCE CREDIT** |

> [!NOTE]
> **Mathematical Verification**:
> $$	ext{Net Ledger Liability} = 	ext{Outstanding Dues Demand} - 	ext{Unallocated Advance Credit}$$
> $$₹2,60,200.00 = ₹2,61,200.00 - ₹1,000.00$$
> There is **zero unexplained discrepancy**.

---

## 7. Recovery Snapshot Verification & Procedure

### Snapshot Metadata
- **File**: `scripts/backups/phase2b_financial_backup_pre.json`
- **Size**: 391,876 bytes
- **Timestamp**: `2026-10-16T13:16:13.512Z`
- **Table Coverage**:
  - `student_dues`: 417 records (100% of all dues across all schools)
  - `fee_ledger`: 87 records (100% of all ledger rows)
  - `fee_receipts`: 2 records
  - `fee_receipt_items`: 1 record
  - `fee_payments`: 2 records
  - `fee_credits`: 1 record

### Recovery Limitation Notice
> [!IMPORTANT]
> This recovery snapshot is a **table-level JSON snapshot of financial tables only**. It is **NOT** a full PostgreSQL cluster backup (`pg_dump`). It does not contain `students`, `profiles`, `schools`, `classes`, or `auth.users`. It is strictly designed to restore financial tables to their pre-repair state if required.

### Step-by-Step Point-in-Time Recovery Procedure
If rollback to the pre-repair snapshot is required:
1. Run the recovery utility:
   ```bash
   node scripts/recover_financial_tables.cjs
   ```
   This parses `scripts/backups/phase2b_financial_backup_pre.json` and generates the SQL restoration script: `scripts/backups/phase2b_financial_recovery.sql`.
2. Apply the generated SQL via Supabase SQL Editor or psql:
   ```bash
   psql -f scripts/backups/phase2b_financial_recovery.sql
   ```
3. Verify that `fee_ledger` row count is 87 and `student_dues` status is restored.

---

## 8. Dry-Run Assertion Verification Results

The dry-run assertion block was executed against the live database in a transactional block with automatic rollback. All 7 assertions passed with 100% precision:
- `v_adj_count == 74` (Transport adjustments)
- `v_adj_sum == -7,240,000 paise` (-₹72,400.00)
- `v_cancelled_count == 6` (Pre-enrollment cancellations)
- `v_pre_enrollment_ledger_count == 0` (Zero phantom ledger entries)
- `v_pending_due_created_count == 104` (Active structure due_created)
- `v_pending_due_created_sum == 17,960,000 paise` (₹1,79,600.00)
- `v_waived_due_created_count == 143` (Waived structure due_created)
- `v_waived_concession_count == 143` (Waived structure concessions)
- `v_total_dues_net == 26,120,000 paise` (₹2,61,200.00)
- `v_total_ledger_net == 26,020,000 paise` (₹2,60,200.00)
- **Live Database Status**: 100% UNMUTATED.
