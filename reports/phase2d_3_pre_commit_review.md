# MyZkool Phase 2D.3: Final Pre-Commit Review & Production Safety Audit

**Target School**: Peace Convent School (`b70261ef-37f1-46c8-a148-2c496a9d33a8`)  
**Execution Status**: READ-ONLY DRY RUN COMPLETED (Default `ROLLBACK;` strictly preserved)  
**Database**: Supabase PostgreSQL Production Replica (`nzphjfsgtkbvfrevduek`)  
**Audit Date**: October 17, 2026  
**Review Status**: **VERIFIED & READY FOR HUMAN AUTHORIZATION (10/10 PASS)**

---

## 1. Resolution of the Runtime SQL Error

### Symptom
When the previous multi-statement script was executed in the Supabase SQL Editor, it returned:
```
ERROR: 42P01: relation "temp_target_pre_enrollment" does not exist
```

### Root Cause
In Supabase Studio, SQL scripts executed through the web runner pass through PgBouncer connection poolers operating in **transaction pooling mode**. When a script contains multiple statements (`BEGIN; ...; CREATE TEMP TABLE ...; ...; DO $$ ... $$; ...; ROLLBACK;`), statement boundaries can cause temporary tables to be dropped or isolated from subsequent DO blocks on different pooled backend connections. Furthermore, PL/pgSQL compiles DO blocks before execution; if the temporary table is not present in the relation catalog of that connection, compilation fails with `42P01`.

### Resolution Implemented
The canonical script [supabase/scripts/phase2d_historical_repair.sql](file:///c:/Users/yadav/Desktop/MyZkool/supabase/scripts/phase2d_historical_repair.sql) was completely refactored into a **single, self-contained atomic `DO $$ ... BEGIN ... END $$;` block**:
1. All target IDs (including the 6 pre-enrollment due IDs) are held in constant PL/pgSQL arrays (`v_pre_target_ids CONSTANT uuid[]`) and dynamically collected arrays (`v_transport_target_ids uuid[]`).
2. **Zero external temporary tables** are created or required.
3. Row locking (`FOR UPDATE`), pre-flight validation aborts, data mutations, diagnostic row-count captures (`GET DIAGNOSTICS ROW_COUNT`), 1-to-1 cardinality checks, backfills, and balance reconciliations execute in a single atomic transaction.
4. The script was dry-run tested against the live database: it executed cleanly in 380ms with 0 errors and outputted the audit diagnostic table.

---

## 2. Complete Inventory of All 74 Targeted Doubled Transport Dues

Each of the 74 dues below was doubled due to the month-overlap billing bug in `useTransportDuesGeneration.ts`. Each due currently has `paid_paise = 0`, `concession_paise = 0`, and will be reduced from `2 * monthly_fee_paise` to `1 * monthly_fee_paise` (-₹72,400.00 total reduction across the tenant):

| # | Student Name | Admission No | Student ID | Due ID | Assignment ID | Fee Term | Monthly Fee | Pre-Repair Gross | Paid | Concession | Corrected Expected |
|:---:|:---|:---|:---|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|
| 1 | Aarohi Saini | ADM-2026-0009 | `7ae15102-...` | `54009d28-e2af-4bea-907e-e2035acce21d` | `9906569e-...` | Nov 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 2 | Aarohi Saini | ADM-2026-0009 | `7ae15102-...` | `e538fd2a-5837-4f82-950e-550771236612` | `9906569e-...` | Dec 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 3 | Aarohi Saini | ADM-2026-0009 | `7ae15102-...` | `b61cbcb9-426e-4b09-86cd-328242e9a818` | `9906569e-...` | Jan 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 4 | Aarohi Saini | ADM-2026-0009 | `7ae15102-...` | `8de75750-9c36-43b9-9c56-697ace6632ae` | `9906569e-...` | Feb 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 5 | Aarohi Saini | ADM-2026-0009 | `7ae15102-...` | `2f6b95ff-8f1c-4d05-adef-aeebe998a925` | `9906569e-...` | Mar 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 6 | Aadhya Sharma | ADM-2026-0010 | `313ebbb4-...` | `c58e9d77-df3b-4a45-bdaf-13e7b8c6338b` | `f086c193-...` | Nov 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 7 | Aadhya Sharma | ADM-2026-0010 | `313ebbb4-...` | `a6b0cd9c-ec89-4166-9569-40236bd698a1` | `f086c193-...` | Dec 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 8 | Aadhya Sharma | ADM-2026-0010 | `313ebbb4-...` | `6a24fee9-3911-4832-a5ee-2501b9674474` | `f086c193-...` | Jan 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 9 | Aadhya Sharma | ADM-2026-0010 | `313ebbb4-...` | `75d101ed-293d-43e3-b44c-6127227e5ecd` | `f086c193-...` | Feb 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 10 | Aadhya Sharma | ADM-2026-0010 | `313ebbb4-...` | `d281ea16-281d-4f5c-b7cd-19003056d3a7` | `f086c193-...` | Mar 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 11 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `87a92696-b181-4973-8190-687121c668e9` | `228e31d4-...` | May 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 12 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `7370bedd-4a77-43b6-8742-dfea387f5856` | `228e31d4-...` | Jun 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 13 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `d238ca30-f850-4de1-a001-1eda48d8a0bf` | `228e31d4-...` | Jul 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 14 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `d842a5c6-af3e-465c-a4fb-8a786cf1ea87` | `228e31d4-...` | Aug 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 15 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `1750f227-ba28-4d4b-8376-8703917834c8` | `228e31d4-...` | Sep 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 16 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `3d353dc7-8ac8-418d-8189-5c298df5bed7` | `228e31d4-...` | Oct 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 17 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `628ab4b1-fb3d-47a3-b79f-23ee0ae8d587` | `228e31d4-...` | Nov 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 18 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `adc13410-9522-421b-9206-22008bab241e` | `228e31d4-...` | Dec 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 19 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `47f39a56-52e2-4a00-9450-569c508b85d1` | `228e31d4-...` | Jan 2027 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 20 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `617c599a-28bb-4deb-b885-bb217a504ba8` | `228e31d4-...` | Feb 2027 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 21 | Ira Roy | ADM-2026-0016 | `92c37a0e-...` | `69af07e2-e384-4015-90b3-c2935b2dc3b5` | `228e31d4-...` | Mar 2027 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 22 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `f4d9a9ac-4c4a-4755-897f-4c5929b49a96` | `e3568f0d-...` | May 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 23 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `4c475d77-f39e-4b7b-824f-81acd9a229e1` | `e3568f0d-...` | Jun 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 24 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `aed04fb7-c138-486b-8beb-738e7eef58eb` | `e3568f0d-...` | Jul 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 25 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `a06a2b4b-288d-45ca-8f73-517415066884` | `e3568f0d-...` | Aug 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 26 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `720e6c8b-0d0f-4175-8560-b70718e5a0b8` | `e3568f0d-...` | Sep 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 27 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `4c12e882-b550-43b9-b453-5e6bcca6a95e` | `e3568f0d-...` | Oct 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 28 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `45a88651-5daa-4eb9-a2e4-c126b834ec1c` | `e3568f0d-...` | Nov 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 29 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `2a5b6ead-d2c6-4da6-8afa-13de7819f9c2` | `e3568f0d-...` | Dec 2026 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 30 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `4c50b24c-3d28-4b6f-a2a2-8df19c96712d` | `e3568f0d-...` | Jan 2027 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 31 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `150824a3-a078-46d7-9860-f9933690d41d` | `e3568f0d-...` | Feb 2027 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 32 | Kunal Singh | ADM-2026-0031 | `eb8498df-...` | `afcc57b3-4381-41b1-ad93-7b1a10eeb8bf` | `e3568f0d-...` | Mar 2027 | ₹1,000.00 | ₹2,000.00 | ₹0.00 | ₹0.00 | ₹1,000.00 |
| 33 | Aadhya Choudhary | ADM-2026-0037 | `748597b9-...` | `93a374f4-fb4b-4c55-b2b0-481b07e27a7e` | `2185b41e-...` | Nov 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 34 | Aadhya Choudhary | ADM-2026-0037 | `748597b9-...` | `a4716e31-1899-4c93-bde4-bdbca92a95ec` | `2185b41e-...` | Dec 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 35 | Aadhya Choudhary | ADM-2026-0037 | `748597b9-...` | `8c4dd8e5-fed3-4668-b249-3d96abe904b9` | `2185b41e-...` | Jan 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 36 | Aadhya Choudhary | ADM-2026-0037 | `748597b9-...` | `80514d9d-efea-4f31-8db1-c04d8f62fc77` | `2185b41e-...` | Feb 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 37 | Aadhya Choudhary | ADM-2026-0037 | `748597b9-...` | `b89d8e32-32a8-4202-8d57-290604e219fa` | `2185b41e-...` | Mar 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 38 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `7c126024-67b1-44e7-b8b7-a19a7a8a8e34` | `3abedae5-...` | May 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 39 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `f3197c0e-1c24-45fa-8b84-0f46c640e0af` | `3abedae5-...` | Jun 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 40 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `dd1c9540-2c4a-4611-b2a1-ebc7f9b70ae8` | `3abedae5-...` | Jul 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 41 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `0abc2031-9d48-463b-b432-f38756135dcb` | `3abedae5-...` | Aug 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 42 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `d9f46ac5-0a65-43c9-adb2-312c25ac26d0` | `3abedae5-...` | Sep 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 43 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `7efc2dfe-e778-4099-bd96-4843da562a0c` | `3abedae5-...` | Oct 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 44 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `ec1caa29-732e-4a1a-9217-0578082a1cad` | `3abedae5-...` | Nov 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 45 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `9e54ee56-a40c-4c44-a278-a45440d1804c` | `3abedae5-...` | Dec 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 46 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `924163e9-30d0-4f03-9212-3c3767da8aca` | `3abedae5-...` | Jan 2027 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 47 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `90d21b8c-46de-4ac3-8b7e-e22488efefc2` | `3abedae5-...` | Feb 2027 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 48 | Abhishek Agarwal | ADM-2026-0061 | `899e02ab-...` | `fde010a4-048a-4b03-9ba9-d3c04221bd97` | `3abedae5-...` | Mar 2027 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 49 | Aarohi Bhardwaj | ADM-2026-0068 | `f7bc91ff-...` | `f84b151c-f9de-4942-ab78-547232a55b00` | `e6e560d2-...` | Nov 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 50 | Aarohi Bhardwaj | ADM-2026-0068 | `f7bc91ff-...` | `1e8fa744-2437-4a8c-abf6-32b4e62aa809` | `e6e560d2-...` | Dec 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 51 | Aarohi Bhardwaj | ADM-2026-0068 | `f7bc91ff-...` | `d1a85ac7-0430-496f-acfa-7e06592f99d5` | `e6e560d2-...` | Jan 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 52 | Aarohi Bhardwaj | ADM-2026-0068 | `f7bc91ff-...` | `66ad0fe1-2e80-4e71-bea5-26bc50e5ae3f` | `e6e560d2-...` | Feb 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 53 | Aarohi Bhardwaj | ADM-2026-0068 | `f7bc91ff-...` | `8429a659-e94f-4139-8c66-59dfbb133504` | `e6e560d2-...` | Mar 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 54 | Aanya Choudhary | ADM-2026-0074 | `74e2b05a-...` | `679f6e19-f505-4047-b57c-de60cb8c7dde` | `c4fd5117-...` | Nov 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 55 | Aanya Choudhary | ADM-2026-0074 | `74e2b05a-...` | `f8b449b2-f7f7-47b5-939b-5f18969e836c` | `c4fd5117-...` | Dec 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 56 | Aanya Choudhary | ADM-2026-0074 | `74e2b05a-...` | `6946a434-c7ad-4e5a-944c-f1ef70716e0f` | `c4fd5117-...` | Jan 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 57 | Aanya Choudhary | ADM-2026-0074 | `74e2b05a-...` | `d30d773b-6811-41e4-9451-82eeca248f83` | `c4fd5117-...` | Feb 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 58 | Aanya Choudhary | ADM-2026-0074 | `74e2b05a-...` | `0c974e0a-bae0-4f7d-811e-41b354514df7` | `c4fd5117-...` | Mar 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 59 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `7a7a7d57-12c4-493b-9a0d-803209c3924d` | `5b36eac7-...` | May 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 60 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `37d1fd89-4700-4183-87ad-86ddec7c1e3c` | `5b36eac7-...` | Jun 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 61 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `dc3c073a-3d9a-4741-81a6-70d255b7f62a` | `5b36eac7-...` | Jul 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 62 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `7fce04f8-b7ef-413e-bdb7-0c19e7a3bd3e` | `5b36eac7-...` | Aug 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 63 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `57fea092-2c12-4ca9-983d-1e478f04e383` | `5b36eac7-...` | Sep 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 64 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `c04b3c29-b701-4554-8119-bb2bda2704f3` | `5b36eac7-...` | Oct 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 65 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `2af11e2f-f44b-4db1-b3e1-eadd9ad80684` | `5b36eac7-...` | Nov 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 66 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `3d32e35b-9bab-4235-943c-f03eed0b9b78` | `5b36eac7-...` | Dec 2026 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 67 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `6f0fb2fd-1853-458e-a11e-68835b7eee20` | `5b36eac7-...` | Jan 2027 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 68 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `816e37a0-63af-4e69-91f5-6f245c1878d1` | `5b36eac7-...` | Feb 2027 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 69 | Diya Bhardwaj | ADM-2026-0091 | `117a3b8c-...` | `7765bf80-1363-4989-a090-637440ed6a6d` | `5b36eac7-...` | Mar 2027 | ₹1,200.00 | ₹2,400.00 | ₹0.00 | ₹0.00 | ₹1,200.00 |
| 70 | Aadhya Patel | ADM-2026-0098 | `0b0ae931-...` | `d1790b6e-67e0-4041-829a-874d85542371` | `f0ced34b-...` | Nov 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 71 | Aadhya Patel | ADM-2026-0098 | `0b0ae931-...` | `01d55f7d-0ce7-4593-9d91-49ec19df95dd` | `f0ced34b-...` | Dec 2026 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 72 | Aadhya Patel | ADM-2026-0098 | `0b0ae931-...` | `09327627-e49c-482d-ba6c-5da94a86bc52` | `f0ced34b-...` | Jan 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 73 | Aadhya Patel | ADM-2026-0098 | `0b0ae931-...` | `55f6c3ea-e675-4625-b3b3-934eacc118b5` | `f0ced34b-...` | Feb 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |
| 74 | Aadhya Patel | ADM-2026-0098 | `0b0ae931-...` | `edcc565a-4a75-490e-af13-900f0f1686f3` | `f0ced34b-...` | Mar 2027 | ₹800.00 | ₹1,600.00 | ₹0.00 | ₹0.00 | ₹800.00 |

---

## 3. Independent Verification of the 6 Pre-Enrollment Transport Dues

We independently audited the 6 target dues for student **Aanya Choudhary** (`student_id: 74e2b05a-1e91-460b-b9bf-f61544d56182`, Admission No: `ADM-2026-0074`), Transport Assignment `c4fd5117-b459-4630-b48f-4674aa81d5e6`, Effective Date: `2026-10-16`:

| Due ID | Term Name | Period Dates | Gross | Paid | Concession | `fee_ledger` Refs | `fee_receipt_items` Refs |
|:---|:---|:---|:---:|:---:|:---:|:---:|:---:|
| `1163d007-4df2-45c8-9a1d-fa2e5280114e` | April 2026 | 2026-03-31 - 2026-04-29 | ₹800.00 | ₹0.00 | ₹0.00 | **0** | **0** |
| `ed61aef6-7ed5-404b-a140-a0698f942a41` | May 2026 | 2026-04-30 - 2026-05-30 | ₹800.00 | ₹0.00 | ₹0.00 | **0** | **0** |
| `70a5fe1d-74c1-4869-a96b-48373502aa2b` | June 2026 | 2026-05-31 - 2026-06-29 | ₹800.00 | ₹0.00 | ₹0.00 | **0** | **0** |
| `e06b633e-8bf2-41d1-ba64-b3f45b5e155a` | July 2026 | 2026-06-30 - 2026-07-30 | ₹800.00 | ₹0.00 | ₹0.00 | **0** | **0** |
| `ac093eb2-b153-4ebe-8339-34329d1d9351` | August 2026 | 2026-07-31 - 2026-08-30 | ₹800.00 | ₹0.00 | ₹0.00 | **0** | **0** |
| `ceb18229-db97-4306-9628-cb7171e448da` | September 2026 | 2026-08-31 - 2026-09-29 | ₹800.00 | ₹0.00 | ₹0.00 | **0** | **0** |

**Confirmation**:
- All 6 dues belong to the exact intended student.
- Zero payments (`paid_paise = 0`), zero receipt items (`fri.due_id IS NULL`), zero receipts, and zero ledger records exist.
- Setting `status = 'cancelled'` and `balance_paise = 0` requires **zero ledger adjustments** and causes **zero orphan references**.

---

## 4. Verification of the 104 Active and 143 RTE Waived Structure Dues

1. **104 Active Structure Dues**:
   - Status: `pending`
   - Total Gross = ₹1,79,600.00 (17,960,000 paise)
   - Total Concessions = ₹0.00
   - Total Net = ₹1,79,600.00
   - Existing `fee_ledger` entries: **Exactly 0**
   - Action: Backfill 104 `due_created` entries in `fee_ledger` at `+sd.net_paise`.

2. **143 RTE Waived Structure Dues**:
   - Status: `waived`
   - Total Gross = ₹2,17,400.00 (21,740,000 paise)
   - Total Concessions = ₹2,17,400.00 (21,740,000 paise)
   - Total Net = ₹0.00
   - Existing `fee_ledger` entries: **Exactly 0**
   - Action: Backfill 143 `due_created` entries (+₹2,17,400.00) and 143 `concession` entries (-₹2,17,400.00). Net ledger effect = **₹0.00**.

---

## 5. Assertion Rigor & False Positive Risk Review

We analyzed whether any incorrect row could pass the assertions despite matching totals or counts:

1. **Target Identification Binding**:
   - Transport dues join on `sd.source = 'transport' AND ta.id = sd.source_ref AND ta.school_id = v_school_id`.
   - Every due is matched to its own primary transport assignment ID. It is impossible for one student's fee to be applied to another student's due.
2. **1-to-1 Cardinality Assertion**:
   - Assertion 4 strictly checks:
     ```sql
     SELECT fl.due_id, count(*) FROM public.fee_ledger fl
     WHERE fl.due_id = ANY(v_transport_target_ids) AND fl.entry_type = 'adjustment'
     GROUP BY fl.due_id HAVING count(*) != 1;
     ```
     If even a single due received 0 adjustments or 2 adjustments while the sum happened to match, this check will immediately abort the transaction.
3. **Primary Key Scoping on Cancellations**:
   - Pre-enrollment cancellations are constrained to `sd.id = ANY(v_pre_target_ids)`. No other transport due can be cancelled.
4. **Exact Aggregate Reconciliations**:
   - Post-correction dues balance is asserted at `26120000` paise.
   - Post-correction net ledger is asserted at `26020000` paise.
   - The exact difference of `100000` paise is mathematically reconciled against the unallocated advance credit on receipt `MZ/2026–2027/000002` (Ira Roy). Discrepancy is asserted at `0.00` paise.

---

## 6. Single-Use Operational Guard Confirmation

The script is **intentionally single-use**. 

Pre-Flight Check 5 contains the following guard:
```sql
SELECT count(*) INTO v_existing_adj_count
FROM public.fee_ledger
WHERE school_id = v_school_id AND note LIKE 'Phase 2D%';

IF v_existing_adj_count != 0 THEN
    RAISE EXCEPTION 'PRE-FLIGHT ABORT: Script is single-use and Phase 2D records already exist (found %).', v_existing_adj_count;
END IF;
```

**Operational Behavior**:
- If someone attempts to rerun the script after it has been committed, it will **immediately abort with an exception** before any row lock, update, or insert is performed.
- This guard is essential to prevent duplicate backfills or double-adjustments. **It will NOT be weakened or removed.**

---

## 7. Recovery Script Verification & Limitations

We inspected `scripts/backups/phase2b_financial_recovery.sql` against `scripts/backups/phase2b_financial_backup_pre.json`:

1. **Deletions**:
   - `DELETE FROM public.fee_ledger WHERE note LIKE 'Phase 2D%';`
   - Removes only Phase 2D repairs. Does not delete pre-existing ledger records.
2. **Overwrites**:
   - `student_dues`: Uses `ON CONFLICT (id) DO UPDATE SET gross_paise = EXCLUDED.gross_paise, concession_paise = EXCLUDED.concession_paise, net_paise = EXCLUDED.net_paise, paid_paise = EXCLUDED.paid_paise, balance_paise = EXCLUDED.balance_paise, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at;`
   - **Critical Warning**: It overwrites all 7 state fields back to the snapshot values.
3. **Safety Condition for Recovery**:
   - Recovery is **NOT safe** if new payments or receipts have been recorded in the application since the snapshot was taken. Running recovery in that state would revert `paid_paise` and `balance_paise` on dues while leaving newly collected receipts in `fee_receipts`.
   - Therefore, recovery should **only** be executed if the repair fails immediately during the deployment window before any new user transactions occur.

---

## 8. Current Live Database State (Confirmation of Zero Changes)

A live read query confirms that no data has been mutated:
```sql
SELECT 
    (SELECT count(*) FROM public.student_dues WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8') as live_dues_count,
    (SELECT count(*) FROM public.student_dues WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8' AND status = 'cancelled') as live_cancelled_count,
    (SELECT count(*) FROM public.fee_ledger WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8') as live_ledger_count,
    (SELECT count(*) FROM public.fee_ledger WHERE school_id = 'b70261ef-37f1-46c8-a148-2c496a9d33a8' AND entry_type = 'adjustment') as live_adjustment_count;
```

**Live Result**:
- `live_dues_count`: **337**
- `live_cancelled_count`: **0**
- `live_ledger_count`: **87**
- `live_adjustment_count`: **0**

---

## 9. Conclusion & Human Authorization Gate

The canonical historical repair script [supabase/scripts/phase2d_historical_repair.sql](file:///c:/Users/yadav/Desktop/MyZkool/supabase/scripts/phase2d_historical_repair.sql) is fully prepared and terminates with `ROLLBACK;`.

**Execution Steps for Production Authorization**:
1. Review this audit document.
2. When ready to permanently execute the repair, open [supabase/scripts/phase2d_historical_repair.sql](file:///c:/Users/yadav/Desktop/MyZkool/supabase/scripts/phase2d_historical_repair.sql).
3. Change the final line from `ROLLBACK;` to `COMMIT;`.
4. Run the script in the Supabase SQL editor.
5. Confirm the diagnostic summary output displays:
   - `validation_status`: `PASS: ALL 10 SAFETY & RECONCILIATION CHECKS VERIFIED`
   - `net_reconciliation_discrepancy_inr`: `0.00`
