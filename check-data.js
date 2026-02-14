// Quick script to check localStorage data in the browser console
// Copy and paste this into the browser console at http://localhost:5173/

console.log('=== NEXUS DATA CHECK ===\n');

// Function to get all knowledge entries from localStorage
function getKnowledgeData() {
  const data = {
    platforms: [],
    peripherals: [],
    snippets: [],
    debug: [],
    config: []
  };
  
  const categories = ['platform', 'peripheral', 'snippet', 'debug', 'config'];
  
  categories.forEach(cat => {
    const prefix = `nexus:knowledge/mcu/${cat}/`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const value = JSON.parse(localStorage.getItem(key));
          data[cat === 'config' ? 'config' : cat + 's'].push(value);
        } catch (e) {
          console.error(`Error parsing ${key}:`, e);
        }
      }
    }
  });
  
  return data;
}

const data = getKnowledgeData();

console.log('📊 Data Summary:');
console.log(`  Platforms: ${data.platforms.length}`);
console.log(`  Peripherals: ${data.peripherals.length}`);
console.log(`  Snippets: ${data.snippets.length}`);
console.log(`  Debug Experiences: ${data.debug.length}`);
console.log(`  Config Templates: ${data.config.length}`);
console.log(`  TOTAL: ${data.platforms.length + data.peripherals.length + data.snippets.length + data.debug.length + data.config.length}`);

console.log('\n📋 Platform Details:');
data.platforms.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.title} (${p.id})`);
});

console.log('\n🔌 Peripheral Details:');
data.peripherals.forEach((p, i) => {
  console.log(`  ${i + 1}. ${p.title} (${p.id})`);
});

console.log('\n💻 Snippet Details:');
data.snippets.forEach((s, i) => {
  console.log(`  ${i + 1}. ${s.title} (${s.id})`);
});

console.log('\n🐛 Debug Experience Details:');
data.debug.forEach((d, i) => {
  console.log(`  ${i + 1}. ${d.title} (${d.id})`);
});

console.log('\n⚙️ Config Template Details:');
data.config.forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.title} (${c.id})`);
});

console.log('\n✅ Data check complete!');
console.log('You can inspect the data object by typing: data');

// Make data available globally
window.nexusData = data;
