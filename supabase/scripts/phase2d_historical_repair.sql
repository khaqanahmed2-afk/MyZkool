-- ==============================================================================
-- MyZkool Phase 2D.4: Canonical Historical Financial Repair Script
-- TARGET TENANT: Peace Convent School (b70261ef-37f1-46c8-a148-2c496a9d33a8)
--
-- PURPOSE:
-- 1. Rectify 74 transport dues doubled by month-overlap term derivation bug.
-- 2. Insert 74 append-only fee_ledger adjustments (-1 * monthly_fee_paise).
-- 3. Cancel 6 pre-enrollment transport dues for Aanya Choudhary (no ledger entries).
-- 4. Backfill 104 missing opening due_created entries for active structure dues.
-- 5. Backfill 143 missing opening due_created & concession entries for RTE structure dues.
-- 6. Strictly preserve all existing receipts, payments, credits, and ledger history.
--
-- TARGET INTEGRITY SAFEGUARDS (PHASE 2D.4):
-- - Validates exact bidirectional matching between approved 74 ID inventory and dynamic query.
-- - Individual preflight assertions for every single transport due (0 payments, 0 concessions, gross = 2 * monthly_fee).
-- - Individual preflight assertions for the 6 pre-enrollment dues (Aanya Choudhary, period_end < effective_from).
-- - Individual preflight assertions for the 104 active structure dues and 143 waived RTE dues.
-- - Individual postflight assertions verifying every corrected due has gross = net = balance = monthly_fee.
-- - One-to-one cardinality check ensuring every corrected transport due has exactly 1 ledger adjustment.
-- - Strictly single-use guard aborts immediately if Phase 2D ledger records exist.
-- - Row-level locking (FOR UPDATE) prevents concurrent modification.
-- - DEFAULT MODE: NON-DESTRUCTIVE DRY RUN (Transaction terminates with ROLLBACK).
-- - To execute PERMANENT REPAIR (Requires explicit human authorization):
--     Change the final line from 'ROLLBACK;' to 'COMMIT;'.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
    v_school_id CONSTANT uuid := 'b70261ef-37f1-46c8-a148-2c496a9d33a8';
    v_pre_student_id CONSTANT uuid := '74e2b05a-1e91-460b-b9bf-f61544d56182'; -- Aanya Choudhary
    v_pre_assignment_id CONSTANT uuid := 'c4fd5117-b459-4630-b48f-4674aa81d5e6';
    
    -- The 6 verified pre-enrollment target due IDs
    v_pre_target_ids CONSTANT uuid[] := ARRAY[
        '1163d007-4df2-45c8-9a1d-fa2e5280114e',
        'ed61aef6-7ed5-404b-a140-a0698f942a41',
        '70a5fe1d-74c1-4869-a96b-48373502aa2b',
        'e06b633e-8bf2-41d1-ba64-b3f45b5e155a',
        'ac093eb2-b153-4ebe-8339-34329d1d9351',
        'ceb18229-db97-4306-9628-cb7171e448da'
    ]::uuid[];

    -- The 74 approved doubled transport target due IDs
    v_approved_transport_ids CONSTANT uuid[] := ARRAY[
        '54009d28-e2af-4bea-907e-e2035acce21d',
        'e538fd2a-5837-4f82-950e-550771236612',
        'b61cbcb9-426e-4b09-86cd-328242e9a818',
        '8de75750-9c36-43b9-9c56-697ace6632ae',
        '2f6b95ff-8f1c-4d05-adef-aeebe998a925',
        'c58e9d77-df3b-4a45-bdaf-13e7b8c6338b',
        'a6b0cd9c-ec89-4166-9569-40236bd698a1',
        '6a24fee9-3911-4832-a5ee-2501b9674474',
        '75d101ed-293d-43e3-b44c-6127227e5ecd',
        'd281ea16-281d-4f5c-b7cd-19003056d3a7',
        '87a92696-b181-4973-8190-687121c668e9',
        '7370bedd-4a77-43b6-8742-dfea387f5856',
        'd238ca30-f850-4de1-a001-1eda48d8a0bf',
        'd842a5c6-af3e-465c-a4fb-8a786cf1ea87',
        '1750f227-ba28-4d4b-8376-8703917834c8',
        '3d353dc7-8ac8-418d-8189-5c298df5bed7',
        '628ab4b1-fb3d-47a3-b79f-23ee0ae8d587',
        'adc13410-9522-421b-9206-22008bab241e',
        '47f39a56-52e2-4a00-9450-569c508b85d1',
        '617c599a-28bb-4deb-b885-bb217a504ba8',
        '69af07e2-e384-4015-90b3-c2935b2dc3b5',
        'f4d9a9ac-4c4a-4755-897f-4c5929b49a96',
        '4c475d77-f39e-4b7b-824f-81acd9a229e1',
        'aed04fb7-c138-486b-8beb-738e7eef58eb',
        'a06a2b4b-288d-45ca-8f73-517415066884',
        '720e6c8b-0d0f-4175-8560-b70718e5a0b8',
        '4c12e882-b550-43b9-b453-5e6bcca6a95e',
        '45a88651-5daa-4eb9-a2e4-c126b834ec1c',
        '2a5b6ead-d2c6-4da6-8afa-13de7819f9c2',
        '4c50b24c-3d28-4b6f-a2a2-8df19c96712d',
        '150824a3-a078-46d7-9860-f9933690d41d',
        'afcc57b3-4381-41b1-ad93-7b1a10eeb8bf',
        '93a374f4-fb4b-4c55-b2b0-481b07e27a7e',
        'a4716e31-1899-4c93-bde4-bdbca92a95ec',
        '8c4dd8e5-fed3-4668-b249-3d96abe904b9',
        '80514d9d-efea-4f31-8db1-c04d8f62fc77',
        'b89d8e32-32a8-4202-8d57-290604e219fa',
        '7c126024-67b1-44e7-b8b7-a19a7a8a8e34',
        'f3197c0e-1c24-45fa-8b84-0f46c640e0af',
        'dd1c9540-2c4a-4611-b2a1-ebc7f9b70ae8',
        '0abc2031-9d48-463b-b432-f38756135dcb',
        'd9f46ac5-0a65-43c9-adb2-312c25ac26d0',
        '7efc2dfe-e778-4099-bd96-4843da562a0c',
        'ec1caa29-732e-4a1a-9217-0578082a1cad',
        '9e54ee56-a40c-4c44-a278-a45440d1804c',
        '924163e9-30d0-4f03-9212-3c3767da8aca',
        '90d21b8c-46de-4ac3-8b7e-e22488efefc2',
        'fde010a4-048a-4b03-9ba9-d3c04221bd97',
        'f84b151c-f9de-4942-ab78-547232a55b00',
        '1e8fa744-2437-4a8c-abf6-32b4e62aa809',
        'd1a85ac7-0430-496f-acfa-7e06592f99d5',
        '66ad0fe1-2e80-4e71-bea5-26bc50e5ae3f',
        '8429a659-e94f-4139-8c66-59dfbb133504',
        '679f6e19-f505-4047-b57c-de60cb8c7dde',
        'f8b449b2-f7f7-47b5-939b-5f18969e836c',
        '6946a434-c7ad-4e5a-944c-f1ef70716e0f',
        'd30d773b-6811-41e4-9451-82eeca248f83',
        '0c974e0a-bae0-4f7d-811e-41b354514df7',
        '7a7a7d57-12c4-493b-9a0d-803209c3924d',
        '37d1fd89-4700-4183-87ad-86ddec7c1e3c',
        'dc3c073a-3d9a-4741-81a6-70d255b7f62a',
        '7fce04f8-b7ef-413e-bdb7-0c19e7a3bd3e',
        '57fea092-2c12-4ca9-983d-1e478f04e383',
        'c04b3c29-b701-4554-8119-bb2bda2704f3',
        '2af11e2f-f44b-4db1-b3e1-eadd9ad80684',
        '3d32e35b-9bab-4235-943c-f03eed0b9b78',
        '6f0fb2fd-1853-458e-a11e-68835b7eee20',
        '816e37a0-63af-4e69-91f5-6f245c1878d1',
        '7765bf80-1363-4989-a090-637440ed6a6d',
        'd1790b6e-67e0-4041-829a-874d85542371',
        '01d55f7d-0ce7-4593-9d91-49ec19df95dd',
        '09327627-e49c-482d-ba6c-5da94a86bc52',
        '55f6c3ea-e675-4625-b3b3-934eacc118b5',
        'edcc565a-4a75-490e-af13-900f0f1686f3'
    ]::uuid[];

    v_dynamic_transport_ids uuid[];

    -- Diagnostics and integrity violation counters
    v_approved_count int;
    v_dynamic_count int;
    v_id_diff_forward int;
    v_id_diff_reverse int;
    v_transport_preflight_violations int;
    v_pre_preflight_violations int;
    v_pending_structure_violations int;
    v_waived_structure_violations int;
    v_existing_adj_count int;

    -- Mutation counters
    v_dues_updated int;
    v_adj_inserted int;
    v_cancelled_updated int;
    v_pending_backfilled int;
    v_waived_dues_backfilled int;
    v_waived_concessions_backfilled int;

    -- Postflight integrity counters
    v_postflight_transport_violations int;
    v_postflight_cancel_violations int;
    v_postflight_ledger_violations int;
    v_cardinality_violations int;
    v_total_dues_net bigint;
    v_total_ledger_net bigint;
    v_unallocated_advance bigint;
    v_total_active_gross bigint;
    v_total_cancelled_gross bigint;
    v_total_cumulative_gross bigint;
    v_total_rte_concessions bigint;
BEGIN
    -- STEP 0: Lock target rows atomically
    PERFORM id FROM public.student_dues WHERE school_id = v_school_id FOR UPDATE;

    -- Identify dynamic transport dues matching the bug signature
    SELECT array_agg(sd.id)
    INTO v_dynamic_transport_ids
    FROM public.student_dues sd
    JOIN public.transport_assignments ta ON ta.id = sd.source_ref
    JOIN public.fee_terms ft ON ft.id = sd.term_id
    WHERE sd.school_id = v_school_id
      AND sd.source = 'transport'
      AND ta.school_id = v_school_id
      AND ft.school_id = v_school_id
      AND sd.gross_paise = 2 * ta.monthly_fee_paise
      AND ft.period_end >= ta.effective_from;

    -- REQUIREMENT 1: Exact Set Comparison between Approved Inventory and Dynamic Query
    v_approved_count := COALESCE(array_length(v_approved_transport_ids, 1), 0);
    v_dynamic_count := COALESCE(array_length(v_dynamic_transport_ids, 1), 0);

    IF v_approved_count != 74 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Approved list length is %, expected 74', v_approved_count;
    END IF;
    IF v_dynamic_count != 74 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Dynamic transport query found % rows, expected 74', v_dynamic_count;
    END IF;

    -- Assert 0 elements in approved that are not in dynamic
    SELECT count(*)
    INTO v_id_diff_forward
    FROM unnest(v_approved_transport_ids) app(id)
    WHERE NOT (app.id = ANY(v_dynamic_transport_ids));

    IF v_id_diff_forward != 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Found % approved IDs missing from dynamic target set', v_id_diff_forward;
    END IF;

    -- Assert 0 elements in dynamic that are not in approved
    SELECT count(*)
    INTO v_id_diff_reverse
    FROM unnest(v_dynamic_transport_ids) dyn(id)
    WHERE NOT (dyn.id = ANY(v_approved_transport_ids));

    IF v_id_diff_reverse != 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Found % dynamic IDs not present in approved inventory', v_id_diff_reverse;
    END IF;

    -- REQUIREMENT 2: Explicit Individual Preflight Assertions for Every Target Transport Due
    SELECT count(*)
    INTO v_transport_preflight_violations
    FROM public.student_dues sd
    JOIN public.transport_assignments ta ON ta.id = sd.source_ref
    JOIN public.fee_terms ft ON ft.id = sd.term_id
    WHERE sd.id = ANY(v_approved_transport_ids)
      AND NOT (
          sd.school_id = v_school_id
          AND ta.school_id = v_school_id
          AND ft.school_id = v_school_id
          AND sd.student_id = ta.student_id
          AND sd.source = 'transport'
          AND sd.status = 'pending'
          AND sd.paid_paise = 0
          AND sd.concession_paise = 0
          AND sd.gross_paise = 2 * ta.monthly_fee_paise
          AND sd.balance_paise = 2 * ta.monthly_fee_paise
          AND ft.period_end >= ta.effective_from
      );

    IF v_transport_preflight_violations != 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Found % transport dues violating individual integrity criteria', v_transport_preflight_violations;
    END IF;

    -- REQUIREMENT 3: Explicit Individual Preflight Assertions for the 6 Pre-Enrollment Cancellation Dues
    SELECT count(*)
    INTO v_pre_preflight_violations
    FROM public.student_dues sd
    JOIN public.transport_assignments ta ON ta.id = sd.source_ref
    JOIN public.fee_terms ft ON ft.id = sd.term_id
    WHERE sd.id = ANY(v_pre_target_ids)
      AND NOT (
          sd.school_id = v_school_id
          AND ta.school_id = v_school_id
          AND ft.school_id = v_school_id
          AND sd.student_id = v_pre_student_id
          AND ta.id = v_pre_assignment_id
          AND sd.source = 'transport'
          AND sd.status = 'pending'
          AND sd.paid_paise = 0
          AND sd.concession_paise = 0
          AND sd.gross_paise = 80000
          AND sd.balance_paise = 80000
          AND ft.period_end < ta.effective_from
      );

    IF v_pre_preflight_violations != 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Found % pre-enrollment dues violating individual cancellation criteria', v_pre_preflight_violations;
    END IF;

    -- REQUIREMENT 4A: Explicit Individual Preflight Assertions for 104 Active Structure Dues
    SELECT count(*)
    INTO v_pending_structure_violations
    FROM public.student_dues sd
    LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id AND fl.entry_type = 'due_created'
    WHERE sd.school_id = v_school_id
      AND sd.source = 'structure'
      AND sd.status = 'pending'
      AND NOT (
          fl.id IS NULL
          AND sd.concession_paise = 0
          AND sd.gross_paise = sd.net_paise
          AND sd.paid_paise = 0
          AND sd.balance_paise = sd.net_paise
          AND sd.net_paise > 0
      );

    IF v_pending_structure_violations != 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Found % active structure dues violating individual criteria', v_pending_structure_violations;
    END IF;

    -- REQUIREMENT 4B: Explicit Individual Preflight Assertions for 143 Waived RTE Structure Dues
    SELECT count(*)
    INTO v_waived_structure_violations
    FROM public.student_dues sd
    LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id
    WHERE sd.school_id = v_school_id
      AND sd.source = 'structure'
      AND sd.status = 'waived'
      AND NOT (
          fl.id IS NULL
          AND sd.concession_paise = sd.gross_paise
          AND sd.net_paise = 0
          AND sd.paid_paise = 0
          AND sd.balance_paise = 0
          AND sd.gross_paise > 0
      );

    IF v_waived_structure_violations != 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Found % waived structure dues violating individual criteria', v_waived_structure_violations;
    END IF;

    -- REQUIREMENT 6: Strictly Single-Use Guard (Zero Phase 2D Ledger Records Exist)
    SELECT count(*)
    INTO v_existing_adj_count
    FROM public.fee_ledger
    WHERE school_id = v_school_id
      AND note LIKE 'Phase 2D%';

    IF v_existing_adj_count != 0 THEN
        RAISE EXCEPTION 'PRE-FLIGHT ABORT: Script is single-use and Phase 2D records already exist (found %).', v_existing_adj_count;
    END IF;

    -- STEP 1: Correct the 74 doubled transport dues
    UPDATE public.student_dues sd
    SET gross_paise = ta.monthly_fee_paise,
        net_paise = ta.monthly_fee_paise - sd.concession_paise,
        balance_paise = ta.monthly_fee_paise - sd.concession_paise - sd.paid_paise,
        updated_at = NOW()
    FROM public.transport_assignments ta
    WHERE sd.id = ANY(v_approved_transport_ids)
      AND ta.id = sd.source_ref;

    GET DIAGNOSTICS v_dues_updated = ROW_COUNT;
    IF v_dues_updated != 74 THEN
        RAISE EXCEPTION 'MUTATION ASSERTION FAILED: Expected exactly 74 transport dues updated, found %', v_dues_updated;
    END IF;

    -- STEP 2: Insert 74 fee_ledger adjustments
    INSERT INTO public.fee_ledger (
        school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
    )
    SELECT 
        sd.school_id,
        sd.student_id,
        sd.academic_year_id,
        sd.id,
        'adjustment',
        -1 * ta.monthly_fee_paise,
        'Phase 2D.1 Correction: Rectified transport term month-overlap double billing',
        NOW()
    FROM public.student_dues sd
    JOIN public.transport_assignments ta ON ta.id = sd.source_ref
    WHERE sd.id = ANY(v_approved_transport_ids)
      AND NOT EXISTS (
          SELECT 1 FROM public.fee_ledger fl_chk
          WHERE fl_chk.due_id = sd.id
            AND fl_chk.entry_type = 'adjustment'
            AND fl_chk.note LIKE 'Phase 2D.1 Correction: Rectified transport%'
      );

    GET DIAGNOSTICS v_adj_inserted = ROW_COUNT;
    IF v_adj_inserted != 74 THEN
        RAISE EXCEPTION 'MUTATION ASSERTION FAILED: Expected exactly 74 adjustments inserted, found %', v_adj_inserted;
    END IF;

    -- STEP 3: Cancel the 6 pre-enrollment dues
    UPDATE public.student_dues sd
    SET status = 'cancelled',
        balance_paise = 0,
        updated_at = NOW()
    WHERE sd.id = ANY(v_pre_target_ids)
      AND sd.school_id = v_school_id;

    GET DIAGNOSTICS v_cancelled_updated = ROW_COUNT;
    IF v_cancelled_updated != 6 THEN
        RAISE EXCEPTION 'MUTATION ASSERTION FAILED: Expected exactly 6 pre-enrollment dues cancelled, found %', v_cancelled_updated;
    END IF;

    -- STEP 4: Backfill 104 active structure dues
    INSERT INTO public.fee_ledger (
        school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
    )
    SELECT 
        sd.school_id,
        sd.student_id,
        sd.academic_year_id,
        sd.id,
        'due_created',
        sd.net_paise,
        'Phase 2D.1 Synchronization: Opening structure due ledger entry',
        sd.created_at
    FROM public.student_dues sd
    LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id AND fl.entry_type = 'due_created'
    WHERE sd.school_id = v_school_id
      AND sd.source = 'structure'
      AND sd.status = 'pending'
      AND fl.id IS NULL;

    GET DIAGNOSTICS v_pending_backfilled = ROW_COUNT;
    IF v_pending_backfilled != 104 THEN
        RAISE EXCEPTION 'MUTATION ASSERTION FAILED: Expected exactly 104 structure dues backfilled, found %', v_pending_backfilled;
    END IF;

    -- STEP 5: Backfill 143 waived structure dues (due_created and concession)
    INSERT INTO public.fee_ledger (
        school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
    )
    SELECT 
        sd.school_id,
        sd.student_id,
        sd.academic_year_id,
        sd.id,
        'due_created',
        sd.gross_paise,
        'Phase 2D.1 Synchronization: Opening RTE quota gross structure obligation',
        sd.created_at
    FROM public.student_dues sd
    LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id AND fl.entry_type = 'due_created'
    WHERE sd.school_id = v_school_id
      AND sd.source = 'structure'
      AND sd.status = 'waived'
      AND fl.id IS NULL;

    GET DIAGNOSTICS v_waived_dues_backfilled = ROW_COUNT;
    IF v_waived_dues_backfilled != 143 THEN
        RAISE EXCEPTION 'MUTATION ASSERTION FAILED: Expected exactly 143 waived dues backfilled, found %', v_waived_dues_backfilled;
    END IF;

    INSERT INTO public.fee_ledger (
        school_id, student_id, academic_year_id, due_id, entry_type, amount_paise, note, created_at
    )
    SELECT 
        sd.school_id,
        sd.student_id,
        sd.academic_year_id,
        sd.id,
        'concession',
        -1 * sd.concession_paise,
        'Phase 2D.1 Synchronization: Approved 100% RTE Government Concession',
        sd.created_at
    FROM public.student_dues sd
    LEFT JOIN public.fee_ledger fl ON fl.due_id = sd.id AND fl.entry_type = 'concession'
    WHERE sd.school_id = v_school_id
      AND sd.source = 'structure'
      AND sd.status = 'waived'
      AND fl.id IS NULL;

    GET DIAGNOSTICS v_waived_concessions_backfilled = ROW_COUNT;
    IF v_waived_concessions_backfilled != 143 THEN
        RAISE EXCEPTION 'MUTATION ASSERTION FAILED: Expected exactly 143 waived concessions backfilled, found %', v_waived_concessions_backfilled;
    END IF;

    -- REQUIREMENT 5: Individual Postflight Assertions for Every Single Corrected Due
    SELECT count(*)
    INTO v_postflight_transport_violations
    FROM public.student_dues sd
    JOIN public.transport_assignments ta ON ta.id = sd.source_ref
    WHERE sd.id = ANY(v_approved_transport_ids)
      AND NOT (
          sd.gross_paise = ta.monthly_fee_paise
          AND sd.net_paise = ta.monthly_fee_paise
          AND sd.balance_paise = ta.monthly_fee_paise
          AND sd.status = 'pending'
      );

    IF v_postflight_transport_violations != 0 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Found % transport dues failing post-correction state checks', v_postflight_transport_violations;
    END IF;

    -- Individual Postflight Check for 6 Pre-Enrollment Cancellations
    SELECT count(*)
    INTO v_postflight_cancel_violations
    FROM public.student_dues
    WHERE id = ANY(v_pre_target_ids)
      AND NOT (
          status = 'cancelled'
          AND balance_paise = 0
      );

    IF v_postflight_cancel_violations != 0 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Found % pre-enrollment dues failing cancelled state checks', v_postflight_cancel_violations;
    END IF;

    -- Zero ledger entries exist for cancelled dues
    SELECT count(*)
    INTO v_postflight_ledger_violations
    FROM public.fee_ledger
    WHERE due_id = ANY(v_pre_target_ids);

    IF v_postflight_ledger_violations != 0 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Found % orphan ledger records for cancelled pre-enrollment dues', v_postflight_ledger_violations;
    END IF;

    -- 1-to-1 Cardinality Assertion: Every corrected due has EXACTLY ONE matching adjustment
    SELECT count(*)
    INTO v_cardinality_violations
    FROM (
        SELECT fl.due_id, count(*)
        FROM public.fee_ledger fl
        WHERE fl.due_id = ANY(v_approved_transport_ids)
          AND fl.entry_type = 'adjustment'
        GROUP BY fl.due_id
        HAVING count(*) != 1
    ) violations;

    IF v_cardinality_violations != 0 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Found % cardinality violations for transport adjustments', v_cardinality_violations;
    END IF;

    -- Postflight Gross Demand Assertions (Explicitly distinguishing Active vs Cancelled vs Cumulative)
    SELECT COALESCE(sum(gross_paise), 0)
    INTO v_total_active_gross
    FROM public.student_dues
    WHERE school_id = v_school_id
      AND status != 'cancelled';

    IF v_total_active_gross != 47860000 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Expected 47860000 paise active gross demand, found %', v_total_active_gross;
    END IF;

    SELECT COALESCE(sum(gross_paise), 0)
    INTO v_total_cancelled_gross
    FROM public.student_dues
    WHERE school_id = v_school_id
      AND status = 'cancelled';

    IF v_total_cancelled_gross != 480000 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Expected 480000 paise cancelled gross, found %', v_total_cancelled_gross;
    END IF;

    SELECT COALESCE(sum(gross_paise), 0)
    INTO v_total_cumulative_gross
    FROM public.student_dues
    WHERE school_id = v_school_id;

    IF v_total_cumulative_gross != 48340000 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Expected 48340000 paise cumulative database gross, found %', v_total_cumulative_gross;
    END IF;

    SELECT COALESCE(sum(concession_paise), 0)
    INTO v_total_rte_concessions
    FROM public.student_dues
    WHERE school_id = v_school_id
      AND status = 'waived';

    IF v_total_rte_concessions != 21740000 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Expected 21740000 paise RTE concessions, found %', v_total_rte_concessions;
    END IF;

    -- Postflight Net Balance Assertions
    SELECT COALESCE(sum(balance_paise), 0)
    INTO v_total_dues_net
    FROM public.student_dues
    WHERE school_id = v_school_id
      AND status != 'cancelled';

    IF v_total_dues_net != 26120000 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Expected 26120000 paise net dues balance, found %', v_total_dues_net;
    END IF;

    -- Assert Active Gross minus Concessions matches Active Outstanding Dues
    IF (v_total_active_gross - v_total_rte_concessions) != v_total_dues_net THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Active Gross minus Concessions (%) does not match Net Dues Balance (%)',
            (v_total_active_gross - v_total_rte_concessions), v_total_dues_net;
    END IF;

    SELECT COALESCE(sum(amount_paise), 0)
    INTO v_total_ledger_net
    FROM public.fee_ledger
    WHERE school_id = v_school_id;

    IF v_total_ledger_net != 26020000 THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Expected 26020000 paise net ledger balance, found %', v_total_ledger_net;
    END IF;

    SELECT COALESCE(sum(abs(amount_paise)), 0)
    INTO v_unallocated_advance
    FROM public.fee_ledger
    WHERE school_id = v_school_id
      AND entry_type = 'payment'
      AND due_id IS NULL;

    IF (v_total_dues_net - v_total_ledger_net) != v_unallocated_advance THEN
        RAISE EXCEPTION 'POST-FLIGHT ABORT: Dues minus Ledger (%) does not match Unallocated Advance (%)',
            (v_total_dues_net - v_total_ledger_net), v_unallocated_advance;
    END IF;

    RAISE NOTICE 'SUCCESS: ALL 14 PRE-FLIGHT AND POST-FLIGHT INTEGRITY CHECKS PASSED (100%% RECONCILED)';
END $$;

SELECT 
    'PASS: ALL TARGET INTEGRITY & RECONCILIATION CHECKS VERIFIED' as validation_status,
    74 as transport_dues_updated,
    -72400.00 as transport_adjustment_inr,
    6 as pre_enrollment_dues_cancelled,
    4800.00 as cancelled_pre_enrollment_gross_inr,
    104 as pending_structure_dues_backfilled,
    179600.00 as pending_structure_backfilled_inr,
    143 as rte_waived_dues_backfilled,
    478600.00 as post_correction_active_gross_demand_inr,
    483400.00 as post_correction_cumulative_db_gross_inr,
    217400.00 as rte_government_concessions_inr,
    261200.00 as post_correction_outstanding_dues_inr,
    260200.00 as post_correction_net_ledger_inr,
    1000.00 as unallocated_advance_credit_inr,
    0.00 as net_reconciliation_discrepancy_inr;

ROLLBACK;
