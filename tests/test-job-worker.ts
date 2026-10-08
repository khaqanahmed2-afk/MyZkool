/**
 * Unit tests for Job Worker Skeleton
 * Source of Truth: docs/SPEC.md Section 4.12 & 8.3
 */

import { JobWorker } from '../src/workers/jobWorker';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✓ ${desc}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${desc}`);
    failed++;
  }
}

async function runJobWorkerTests() {
  console.log('============================================================');
  console.log('MYZKOOL PHASE 0: BACKGROUND JOBS WORKER TEST SUITE');
  console.log('============================================================\n');

  const worker = new JobWorker();

  // 1. Register handlers
  let sampleExecutedWith: any = null;
  worker.registerHandler('test_sample_job', async (payload) => {
    sampleExecutedWith = payload;
    return { success: true, processedStudents: payload.studentCount };
  });

  let failAttemptCount = 0;
  worker.registerHandler('test_failing_job', async () => {
    failAttemptCount++;
    throw new Error('Simulated external API timeout');
  });

  // 2. Enqueue and process successful job
  console.log('1. Job Enqueue & Atomic Processing:');
  const jobId = await worker.enqueueJob('test_sample_job', {
    schoolId: 'school-123',
    studentCount: 42,
  });
  assert(typeof jobId === 'number', 'Job successfully enqueued with numeric ID');

  const processRes = await worker.processNextJob();
  assert(processRes.processed === true, 'Worker successfully claimed and executed job');
  assert(sampleExecutedWith?.studentCount === 42, 'Job handler received exact payload');

  const jobs = worker.getMemoryJobs();
  const completedJob = jobs.find((j) => j.id === jobId);
  assert(completedJob?.status === 'completed', 'Job transitioned to status completed');

  // 3. Retry and failure behavior
  console.log('\n2. Retry and Error Handling (3 attempts):');
  const failingJobId = await worker.enqueueJob('test_failing_job', { action: 'retry_test' });

  // Attempt 1
  const fail1 = await worker.processNextJob();
  assert(fail1.processed === true && !!fail1.error, 'First attempt catches error and records message');
  const jobState1 = jobs.find((j) => j.id === failingJobId);
  assert(jobState1?.status === 'queued' && jobState1?.attempts === 1, 'Job remains queued for retry #2');

  // Fast-forward run_at for test
  if (jobState1) jobState1.run_at = new Date(Date.now() - 1000).toISOString();

  // Attempt 2
  await worker.processNextJob();
  assert(jobState1?.attempts === 2, 'Job attempts incremented to 2');

  // Fast-forward run_at for test
  if (jobState1) jobState1.run_at = new Date(Date.now() - 1000).toISOString();

  // Attempt 3 (final)
  await worker.processNextJob();
  assert(jobState1?.attempts === 3, 'Job attempts reached 3');
  assert(jobState1?.status === 'failed', 'Job permanently marked as failed after 3 attempts');

  console.log('\n============================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

runJobWorkerTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
