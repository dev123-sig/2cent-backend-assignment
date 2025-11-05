/**
 * Load test script for exchange backend
 * 
 * Tests order submission under load and measures latency
 * 
 * Usage: node tests/load-test.js [duration_seconds] [concurrency]
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const DURATION_SECONDS = parseInt(process.argv[2] || '60');
const CONCURRENCY = parseInt(process.argv[3] || '50');
const TARGET_RPS = 2000;

const stats = {
  total: 0,
  success: 0,
  errors: 0,
  latencies: [],
  startTime: null,
  endTime: null,
};

/**
 * Generate random order
 */
function generateOrder() {
  const side = Math.random() > 0.5 ? 'buy' : 'sell';
  const type = Math.random() > 0.2 ? 'limit' : 'market';
  
  const order = {
    idempotency_key: `load-test-${Date.now()}-${Math.random()}`,
    client_id: `load-client-${Math.floor(Math.random() * 100)}`,
    instrument: 'BTC-USD',
    side,
    type,
    quantity: (Math.random() * 5 + 0.001).toFixed(8),
  };
  
  if (type === 'limit') {
    const basePrice = 70000;
    const spread = (Math.random() * 1000 - 500);
    order.price = (basePrice + spread).toFixed(2);
  }
  
  return order;
}

/**
 * Submit single order
 */
async function submitOrder() {
  const order = generateOrder();
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(order),
    });
    
    const latency = Date.now() - startTime;
    stats.latencies.push(latency);
    stats.total++;
    
    if (response.ok) {
      stats.success++;
    } else {
      stats.errors++;
      const error = await response.json();
      if (response.status !== 429) { // Don't log rate limit errors
        console.error(`❌ Error: ${error.message}`);
      }
    }
    
    return latency;
  } catch (error) {
    stats.errors++;
    stats.total++;
    console.error(`❌ Request failed: ${error.message}`);
    return null;
  }
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((sorted.length * p) / 100) - 1;
  return sorted[index];
}

/**
 * Print progress
 */
function printProgress() {
  const elapsed = (Date.now() - stats.startTime) / 1000;
  const rps = stats.total / elapsed;
  const successRate = (stats.success / stats.total * 100).toFixed(2);
  
  process.stdout.write(
    `\r⏱️  ${elapsed.toFixed(0)}s | ` +
    `📊 ${stats.total} req | ` +
    `✅ ${stats.success} | ` +
    `❌ ${stats.errors} | ` +
    `📈 ${rps.toFixed(0)} req/s | ` +
    `✓ ${successRate}%   `
  );
}

/**
 * Print final statistics
 */
function printStats() {
  console.log('\n\n📊 Load Test Results\n');
  console.log('═'.repeat(60));
  
  const duration = (stats.endTime - stats.startTime) / 1000;
  const rps = stats.total / duration;
  const successRate = (stats.success / stats.total * 100).toFixed(2);
  
  console.log(`\n⏱️  Duration: ${duration.toFixed(2)}s`);
  console.log(`📦 Total Requests: ${stats.total}`);
  console.log(`✅ Successful: ${stats.success} (${successRate}%)`);
  console.log(`❌ Errors: ${stats.errors}`);
  console.log(`📈 Throughput: ${rps.toFixed(0)} requests/sec`);
  
  if (stats.latencies.length > 0) {
    console.log('\n📉 Latency Distribution:');
    console.log(`   Min:  ${Math.min(...stats.latencies)}ms`);
    console.log(`   Max:  ${Math.max(...stats.latencies)}ms`);
    console.log(`   Mean: ${(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length).toFixed(2)}ms`);
    console.log(`   p50:  ${percentile(stats.latencies, 50)}ms`);
    console.log(`   p95:  ${percentile(stats.latencies, 95)}ms`);
    console.log(`   p99:  ${percentile(stats.latencies, 99)}ms`);
  }
  
  console.log('\n' + '═'.repeat(60));
  
  // Performance assessment
  console.log('\n🎯 Performance Assessment:');
  
  const p50 = percentile(stats.latencies, 50);
  const targetMet = rps >= TARGET_RPS * 0.8 && p50 < 100;
  
  if (targetMet) {
    console.log(`   ✅ Target met! (${TARGET_RPS} req/s, <100ms p50)`);
  } else {
    console.log(`   ⚠️  Target not met (goal: ${TARGET_RPS} req/s, <100ms p50)`);
  }
  
  if (stats.errors > stats.total * 0.01) {
    console.log(`   ⚠️  High error rate: ${(stats.errors / stats.total * 100).toFixed(2)}%`);
  }
  
  console.log('');
}

/**
 * Run load test with controlled concurrency
 */
async function runLoadTest() {
  console.log('🚀 Starting Load Test\n');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Duration: ${DURATION_SECONDS}s`);
  console.log(`   Concurrency: ${CONCURRENCY}`);
  console.log(`   Target RPS: ${TARGET_RPS}`);
  console.log('\n' + '═'.repeat(60) + '\n');
  
  stats.startTime = Date.now();
  const endTime = stats.startTime + DURATION_SECONDS * 1000;
  
  // Progress printer
  const progressInterval = setInterval(printProgress, 1000);
  
  // Worker function
  const worker = async () => {
    while (Date.now() < endTime) {
      await submitOrder();
      
      // Adaptive delay to target RPS
      const currentRps = stats.total / ((Date.now() - stats.startTime) / 1000);
      if (currentRps > TARGET_RPS * 1.2) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
  };
  
  // Run workers concurrently
  const workers = Array(CONCURRENCY).fill(null).map(() => worker());
  await Promise.all(workers);
  
  clearInterval(progressInterval);
  stats.endTime = Date.now();
  
  printStats();
}

/**
 * Check if server is reachable
 */
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/healthz`);
    if (response.ok) {
      console.log('✅ Server is reachable\n');
      return true;
    } else {
      console.error('❌ Server returned error status');
      return false;
    }
  } catch (error) {
    console.error(`❌ Cannot reach server at ${BASE_URL}`);
    console.error(`   Make sure the server is running: npm start`);
    return false;
  }
}

// Main execution
(async () => {
  const serverReachable = await checkServer();
  if (!serverReachable) {
    process.exit(1);
  }
  
  await runLoadTest();
})();
