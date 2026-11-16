const $=id=>document.getElementById(id);
const SAVE_KEY="penjaga-kebun-v3";
const SUBJECT_ORDER=["mtk","bing","ips","ipa","bindo"];
const ROW_COUNT=5, PLANTS_PER_ROW=7, DAY_SECONDS=300, PERIOD_SECONDS=100;
const WATER_INTERVAL=30;
const DAILY_TARGET=250;
const CROPS=[
 {id:"padi",name:"Padi",emoji:"🌾",price:2,harvest:25,unlock:1,description:"Tanaman pangan utama."},
 {id:"pisang",name:"Pisang",emoji:"🍌",price:5,harvest:50,unlock:1,description:"Buah manis yang mudah tumbuh."},
 {id:"jagung",name:"Jagung",emoji:"🌽",price:8,harvest:80,unlock:2,description:"Tongkol jagung segar."},
 {id:"wortel",name:"Wortel",emoji:"🥕",price:10,harvest:110,unlock:2,description:"Sayuran akar kaya warna."},
 {id:"stroberi",name:"Stroberi",emoji:"🍓",price:15,harvest:160,unlock:2,description:"Buah merah dari kebun."},
 {id:"anggur",name:"Anggur",emoji:"🍇",price:18,harvest:220,unlock:2,description:"Buah manis bernilai tinggi."},
 {id:"durian",name:"Durian",emoji:"🌳",price:20,harvest:300,unlock:2,description:"Buah istimewa dengan hasil panen tinggi."}
];
const LEVELS=[
 {id:1,grade:4,name:"Awal Kedatangan",desc:"Mengenal awal masa penjajahan"},
 {id:2,grade:4,name:"Monopoli Perdagangan",desc:"Mengenal penguasaan perdagangan"},
 {id:3,grade:5,name:"Perlawanan Daerah",desc:"Mengenal perjuangan rakyat"},
 {id:4,grade:5,name:"Tanam Paksa",desc:"Memahami kebijakan kolonial"},
 {id:5,grade:6,name:"Kebangkitan Nasional",desc:"Mengenal tumbuhnya persatuan"},
 {id:6,grade:6,name:"Menuju Kemerdekaan",desc:"Menelusuri akhir masa penjajahan"}
];
const PLANT_STAGES=["🌱","🌿","🪴","🌼"];
const GROWTH_INTERVAL_MS=1000;
const COSTUMES=[
 {id:"default",name:"Petani Pemula",price:0,file:"default.png",emoji:"🧑‍🌾"},
 {id:"kostum-1",name:"Kostum 1",price:10,file:"kostum-1.png",emoji:"🧢"},
 {id:"kostum-2",name:"Kostum 2",price:20,file:"kostum-2.png",emoji:"👒"},
 {id:"kostum-3",name:"Kostum 3",price:30,file:"kostum-3.png",emoji:"🎩"}
];
const PERIODS=[
 {name:"Pagi",key:"morning",icon:"🌅",tip:"Embun pagi menyegarkan kebun. Saatnya mulai merawat tanaman."},
 {name:"Siang",key:"noon",icon:"☀️",tip:"Matahari siang membantu tanaman tumbuh lebih cepat."},
 {name:"Malam",key:"night",icon:"🌙",tip:"Malam tiba. Tetap perhatikan tanaman sebelum hari berganti."}
];
let growthLoop=null,save=loadSave(),game=null,usedQuestions=new Set(),activeRow=null,activeQuestion=null;
function loadSave(){
 try{
  const d=Object.assign({unlocked:1,completed:[],coins:0,stars:0,ownedSeeds:["padi"],selectedSeed:"padi",fertilizer:0,autoWater:0,ownedCostumes:["default"],selectedCostume:"default"},JSON.parse(localStorage.getItem(SAVE_KEY)||localStorage.getItem("penjaga-kebun-v2")||"{}"));
  ["completed","ownedSeeds","ownedCostumes"].forEach(k=>{if(!Array.isArray(d[k]))d[k]=[];});
  if(!d.ownedSeeds.includes("padi"))d.ownedSeeds.unshift("padi");
  if(!d.ownedCostumes.includes("default"))d.ownedCostumes.unshift("default");
  if(!CROPS.some(c=>c.id===d.selectedSeed)||!d.ownedSeeds.includes(d.selectedSeed))d.selectedSeed="padi";
  if(!COSTUMES.some(c=>c.id===d.selectedCostume)||!d.ownedCostumes.includes(d.selectedCostume))d.selectedCostume="default";
  return d;
 }catch{return {unlocked:1,completed:[],coins:0,stars:0,ownedSeeds:["padi"],selectedSeed:"padi",fertilizer:0,autoWater:0,ownedCostumes:["default"],selectedCostume:"default"}}
}
function persist(){localStorage.setItem(SAVE_KEY,JSON.stringify(save));renderLevels();renderSeedShop();renderProfile();updateTop();}
function updateTop(){
 $("coin-count").textContent="🪙 "+save.coins;$("star-count").textContent="⭐ "+save.stars;
 if($("shop-coins"))$("shop-coins").textContent=save.coins;
 if($("fertilizer-count"))$("fertilizer-count").textContent=save.fertilizer;
 if($("auto-water-count"))$("auto-water-count").textContent=save.autoWater;
}
function renderSeedShop(){
 if(!$("seed-list"))return;
 $("seed-list").innerHTML=CROPS.map(c=>{
  const owned=save.ownedSeeds.includes(c.id),unlocked=save.unlocked>=c.unlock,selected=save.selectedSeed===c.id;
  const image=`assets/seeds/${c.id}.png`,growSeconds=20+CROPS.findIndex(x=>x.id===c.id)*3;
  const action=owned?"Pilih bibit":unlocked?`Beli · ${c.price} koin`:`Terbuka di Level ${c.unlock}`;
  return `<article class="seed-card ${selected?"selected":""} ${!unlocked?"locked":""}"><div class="seed-art"><img src="${image}" alt="${c.name}" onerror="this.replaceWith(document.createTextNode('${c.emoji}'))"></div><div class="seed-card-body"><div class="seed-card-title"><b>${c.name}</b>${selected?'<span class="seed-tag">Dipilih</span>':owned?'<span class="seed-tag owned">Dimiliki</span>':''}</div><p>${c.description}</p><div class="seed-values"><span>🌱 Harga ${c.price} koin</span><span>⏱️ Tumbuh lebih cepat</span><strong>🧺 Panen ${c.harvest} koin</strong></div><button class="seed-action ${owned?"choose":""}" data-seed="${c.id}" ${!unlocked?"disabled":""}>${action}</button></div></article>`;
 }).join("");
 $("selected-seed-name").textContent=(CROPS.find(c=>c.id===save.selectedSeed)||CROPS[0]).name;
}
function buyOrSelectSeed(id){
 const c=CROPS.find(x=>x.id===id);if(!c||save.unlocked<c.unlock)return;
 if(save.ownedSeeds.includes(id)){save.selectedSeed=id;persist();if(game)renderGarden();return;}
 if(save.coins<c.price){alert("Koin belum cukup untuk membeli bibit ini.");return;}
 save.coins-=c.price;save.ownedSeeds.push(id);save.selectedSeed=id;persist();if(game)renderGarden();
}
function renderLevels(){
 $("level-list").innerHTML=LEVELS.map(l=>{const done=save.completed.includes(l.id),open=l.id<=save.unlocked;return `<button class="level-card ${done?"done":open?"open":"locked"}" data-level="${l.id}" ${open?"":"disabled"}><span class="level-icon">${done?"🏆":open?"🌱":"🔒"}</span><b>Level ${l.id}</b><small>Kelas ${l.grade}</small><small>${done?"Selesai":open?l.name:"Selesaikan level sebelumnya"}</small></button>`;}).join("");
}
function newLevel(id){
 game={level:LEVELS.find(x=>x.id===id),day:1,dayElapsed:0,periodIndex:0,dayPoints:0,rows:Array.from({length:ROW_COUNT},(_,i)=>({id:i,progress:0,waterElapsed:WATER_INTERVAL,harvests:0,growthElapsed:0,needsWater:true})),harvests:0,coins:0,completed:false,rainActive:false,rainCooldown:35+Math.random()*40};
 usedQuestions=new Set();startDay();
}
function startDay(){
 game.dayElapsed=0;game.periodIndex=0;game.dayPoints=0;
 game.rows.forEach(r=>{r.waterElapsed=WATER_INTERVAL;r.needsWater=true;});
 updatePeriod();renderGarden();renderGameProgress();updateDayTimer();
 if(!growthLoop)growthLoop=setInterval(tickGame,1000);
}
function updatePeriod(){
 const period=PERIODS[game.periodIndex],scene=$("scene");
 scene.className=`scene time-${period.key} day-${game.day}`;
 scene.dataset.time=period.key;scene.dataset.day=String(game.day);scene.dataset.period=String(game.periodIndex);
 $("scene-sky-icon").textContent=period.icon;
 $("level-label").textContent=`BABAK ${game.level.id} · KELAS ${game.level.grade}`;
 $("session-label").textContent=`Hari ${game.day} · ${period.name}`;
 $("scene-tip").textContent=period.tip;
}
function updateDayTimer(){
 const left=Math.max(0,DAY_SECONDS-game.dayElapsed);
 $("day-timer").textContent=`⏱️ ${String(Math.floor(left/60)).padStart(2,"0")}:${String(left%60).padStart(2,"0")}`;
 $("day-progress").style.width=(left/DAY_SECONDS*100)+"%";
}
function renderGarden(){
 if(!game)return;
 const crop=CROPS.find(c=>c.id===save.selectedSeed)||CROPS[0];
 $("rows").innerHTML=game.rows.map((r,i)=>{
  const stage=r.progress>=100?3:r.progress>=65?2:r.progress>=30?1:0,ready=r.progress>=100;
  const assetKey=stage===0?"stage-1":stage===1?"stage-2":stage===2?"stage-3":"harvest";
  const img=`assets/plants/${crop.id}/${assetKey}.png`;
  const plants=Array.from({length:PLANTS_PER_ROW},()=>`<span class="plant"><img src="${img}" alt="${crop.name}" onerror="this.replaceWith(document.createTextNode('${crop.emoji}'))"></span>`).join("");
  const remaining=Math.max(0,WATER_INTERVAL-r.waterElapsed);
  const status=r.needsWater?"Perlu disiram sekarang":`Penyiraman berikutnya ${remaining} detik`;
  return `<div class="plant-row ${ready?"ready":""}"><div class="row-name">Baris ${i+1}<small>${crop.name} · ${Math.floor(r.progress)}% · ${r.harvests} panen</small><div class="row-meter"><i style="width:${r.progress}%"></i></div><small class="growth-timer">${status}</small></div><div class="plants" aria-label="Tujuh tanaman">${plants}</div><div class="row-actions"><button class="water-btn" data-row="${i}" ${!r.needsWater?"disabled":""}>${r.needsWater?(ready?"💧 Siram & panen":"💧 Siram sekarang"):"⏳ Tunggu"}</button>${save.autoWater>0&&r.needsWater?`<button class="auto-water-btn" data-auto="${i}">⚡ Pakai petak (${save.autoWater})</button>`:""}${save.fertilizer>0&&r.progress<100?`<button class="fertilizer-btn" data-fertilizer="${i}">🌿 Pupuk (${save.fertilizer})</button>`:""}</div></div>`;
 }).join("");
 $("session-progress").textContent=`${game.rows.filter(r=>r.needsWater).length} baris membutuhkan air`;
}
function renderGameProgress(){
 if(!game)return;
 $("progress-label").textContent=`${game.harvests} panen`;
 $("level-progress").style.width=Math.min(100,game.harvests/5*100)+"%";
 $("game-coins").textContent="🪙 "+save.coins;
 $("daily-points").textContent=`${game.dayPoints} poin`;
 $("daily-progress").style.width=Math.min(100,game.dayPoints/DAILY_TARGET*100)+"%";
}
function chooseQuestion(row){
 const q=getQuestion(game.level.grade,SUBJECT_ORDER[Math.floor(Math.random()*SUBJECT_ORDER.length)],usedQuestions);
 activeRow=row;activeQuestion=q;
 const meta=SUBJECTS.find(s=>s.id===q.subject)||SUBJECTS.find(s=>s.id===SUBJECT_ORDER[0]);
 $("question-subject").textContent=meta.emoji+" "+meta.name.toUpperCase()+" · KELAS "+game.level.grade;
 $("question-title").textContent="Jawab pertanyaan untuk menyiram!";
 $("question-text").textContent=q.question;$("answer-feedback").textContent="";$("answer-feedback").className="feedback";
 $("question-continue").hidden=true;
 $("answer-list").innerHTML=q.options.map((o,i)=>`<button class="answer" data-answer="${i}">${String.fromCharCode(65+i)}. ${escapeHtml(o)}</button>`).join("");
 $("question-modal").hidden=false;
}
function awardRandomReward(){
 const reward=Math.floor(Math.random()*3);
 if(reward===0){const amount=5+Math.floor(Math.random()*6);save.coins+=amount;game.coins+=amount;return `🪙 Bonus ${amount} koin`;}
 if(reward===1){save.fertilizer++;return "🌿 1 pupuk";}
 save.autoWater++;return "⚡ 1 petak penyiraman otomatis";
}
function waterRow(index,byQuestion=false){
 const row=game.rows[index];if(!row||!row.needsWater)return;
 row.needsWater=false;row.waterElapsed=0;
 const crop=CROPS.find(c=>c.id===save.selectedSeed)||CROPS[0];
 let growth=12;
 if(game.periodIndex===1)growth*=2;
 if(row.progress>=100){row.harvests++;game.harvests++;const earned=crop.harvest;save.coins+=earned;game.coins+=earned;row.progress=0;growth=12;}
 row.progress=Math.min(100,row.progress+growth);
  
 if(row.progress>=100){row.harvests++;game.harvests++;save.coins+=crop.harvest;game.coins+=crop.harvest;}
 if(byQuestion){
  save.coins+=5;game.coins+=5;game.dayPoints+=15;
  const bonus=awardRandomReward();
  $("answer-feedback").innerHTML+=`<br><b>Hadiah: 🪙 5 koin + ${bonus}</b>`;
 }
 renderGarden();renderGameProgress();persist();
}
function answerQuestion(index){
 if(!activeQuestion||!game)return;
 const q=activeQuestion,correct=index===q.answer;
 document.querySelectorAll(".answer").forEach((b,i)=>{b.disabled=true;if(i===q.answer)b.classList.add("correct");else if(i===index)b.classList.add("incorrect");});
 const feedback=$("answer-feedback");
 feedback.className="feedback "+(correct?"good":"try");
 feedback.innerHTML=correct?`🌟 Jawaban benar! Tanaman mendapat pertumbuhan tambahan.<br><small>${escapeHtml(q.explanation||"Terus belajar dan rawat kebunmu!")}</small>`:`🌱 Belum tepat, tetapi tanaman tetap disiram.<br><small>${escapeHtml(q.explanation||"Terus belajar dan rawat kebunmu!")}</small>`;
 const row=game.rows[activeRow];
 waterRow(activeRow,true);
 if(correct){row.progress=Math.min(100,row.progress+15);save.stars+=1;game.dayPoints+=10;}
 else game.dayPoints+=5;
 renderGarden();renderGameProgress();
 $("question-continue").hidden=false;$("question-continue").textContent="Kembali ke kebun";
}
function useAutoWater(index){
 if(save.autoWater<=0||!game.rows[index]?.needsWater)return;
 save.autoWater--;waterRow(index,false);
}
function useFertilizer(index){
 if(save.fertilizer<=0)return;
 save.fertilizer--;
 const row=game.rows[index];row.progress=Math.min(100,row.progress+25);
 if(row.progress>=100){const crop=CROPS.find(c=>c.id===save.selectedSeed)||CROPS[0];row.harvests++;game.harvests++;save.coins+=crop.harvest;game.coins+=crop.harvest;}
 renderGarden();renderGameProgress();persist();
}
function tickGame(){
 if(!game||$("screen-game").hidden)return;
 game.dayElapsed++;game.periodIndex=Math.min(2,Math.floor(game.dayElapsed/PERIOD_SECONDS));
 if(game.periodIndex!==Number($("scene").dataset.period||0)){
  $("scene").dataset.period=String(game.periodIndex);updatePeriod();
 }
 const crop=CROPS.find(c=>c.id===save.selectedSeed)||CROPS[0];
 const cropIndex=Math.max(0,CROPS.findIndex(c=>c.id===save.selectedSeed));
 const baseGrowth=1.8+(6-cropIndex)*.15;
 game.rows.forEach(r=>{
  if(r.progress>0&&r.progress<100){
   let speed=baseGrowth;
   if(game.periodIndex===1)speed*=2;
   if(save.fertilizer>0&&r.progress<100&&r.fertilizerBoost){speed*=2;r.fertilizerBoost--;}
   r.progress=Math.min(100,r.progress+speed);
   if(r.progress>=100){r.harvests++;game.harvests++;const earned=crop.harvest;save.coins+=earned;game.coins+=earned;game.dayPoints+=10;}
  }
  if(!r.needsWater){r.waterElapsed++;if(r.waterElapsed>=WATER_INTERVAL)r.needsWater=true;}
 });
 game.rainCooldown--;
 if(game.rainCooldown<=0&&!game.rainActive){
  game.rainActive=true;game.rainCooldown=55+Math.floor(Math.random()*65);
  game.rows.forEach(r=>{r.needsWater=false;r.waterElapsed=0;r.progress=Math.min(100,r.progress+8);});
  $("weather-notice").hidden=false;$("weather-notice").textContent="🌧️ Hujan turun! Semua petak tersiram otomatis.";
  setTimeout(()=>{if($("weather-notice"))$("weather-notice").hidden=true;},4500);
  game.rainActive=false;
 }
 if(game.dayElapsed%5===0){renderGarden();renderGameProgress();persist();}
 updateDayTimer();
 if(game.dayElapsed>=DAY_SECONDS)endDay();
}
function endDay(){
 if(game.day===1){game.day=2;startDay();}
 else finishLevel();
}
function finishLevel(){
 const passed=game.harvests>=5,bonus=passed?100:30;
 save.coins+=bonus;game.coins+=bonus;
 if(!save.completed.includes(game.level.id))save.completed.push(game.level.id);
 save.unlocked=Math.max(save.unlocked,Math.min(6,game.level.id+1));save.stars+=passed?3:1;
 persist();
 $("result-emoji").textContent=passed?"🏆":"🌱";$("result-title").textContent=passed?"Kebun berhasil dirawat!":"Dua hari di kebun selesai!";
 $("result-text").textContent=`Kamu menyelesaikan 2 hari pada babak ${game.level.id}. Total panen: ${game.harvests}.`;
 $("result-rewards").textContent=`🪙 Bonus ${bonus} koin · 🌼 ${game.harvests} panen · ⭐ ${save.stars} poin`;
 $("result-button").textContent=game.level.id<6?"Lanjut ke level berikutnya":"Kembali ke halaman utama";
 $("level-modal").hidden=false;
 $("result-button").onclick=()=>{$("level-modal").hidden=true;if(game.level.id<6)newLevel(game.level.id+1);else{game=null;showHomeScreen();}};
}
function renderProfile(){
 const current=COSTUMES.find(c=>c.id===save.selectedCostume)||COSTUMES[0];
 const img=$("profile-avatar");if(img){img.src=`assets/profile-costumes/${current.file}`;img.onerror=()=>{img.style.display="none";$("profile-emoji").style.display="";};img.onload=()=>{$("profile-emoji").style.display="none";img.style.display="block";};}
 if($("profile-emoji"))$("profile-emoji").textContent=current.emoji;
 if($("profile-modal-emoji"))$("profile-modal-emoji").textContent=current.emoji;
 if(!$("costume-list"))return;
 $("costume-list").innerHTML=COSTUMES.map(c=>{
  const owned=save.ownedCostumes.includes(c.id),selected=save.selectedCostume===c.id;
  return `<article class="costume-card"><div class="costume-preview"><img src="assets/profile-costumes/${c.file}" alt="${c.name}" onerror="this.replaceWith(document.createTextNode('${c.emoji}'))"></div><b>${c.name}</b><small>${c.price===0?"Gratis":`⭐ ${c.price} poin`}</small><button class="btn ${selected?"light":"primary"} small" data-costume="${c.id}" ${selected?"disabled":""}>${selected?"Dipakai":owned?"Pakai": "Beli"}</button></article>`;
 }).join("");
 $("profile-points").textContent=save.stars;
}
function handleCostume(id){
 const c=COSTUMES.find(x=>x.id===id);if(!c)return;
 if(save.ownedCostumes.includes(id)){save.selectedCostume=id;persist();return;}
 if(save.stars<c.price){alert("Poin belum cukup untuk membeli kostum.");return;}
 save.stars-=c.price;save.ownedCostumes.push(id);save.selectedCostume=id;persist();
}
function startLevel(id){if(id>save.unlocked)return;$("screen-home").hidden=true;$("screen-game").hidden=false;newLevel(id);}
function showGameScreen(){$("screen-home").hidden=true;$("screen-game").hidden=false;if(game){renderGarden();renderGameProgress();}}
function showHomeScreen(){$("screen-game").hidden=true;$("screen-home").hidden=false;$("start-btn").textContent=game?"Lanjutkan kebun ➜":"Mulai bermain ➜";renderSeedShop();renderLevels();renderProfile();}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("start-btn").addEventListener("click",()=>game?showGameScreen():startLevel(save.unlocked));
$("seed-list").addEventListener("click",e=>{const b=e.target.closest("[data-seed]");if(b)buyOrSelectSeed(b.dataset.seed);});
$("level-list").addEventListener("click",e=>{const b=e.target.closest("[data-level]");if(b)startLevel(Number(b.dataset.level));});
$("rows").addEventListener("click",e=>{
 const b=e.target.closest("[data-row]"),a=e.target.closest("[data-auto]"),f=e.target.closest("[data-fertilizer]");
 if(a){useAutoWater(Number(a.dataset.auto));return;}if(f){useFertilizer(Number(f.dataset.fertilizer));return;}
 if(b){const i=Number(b.dataset.row);if(game.rows[i].needsWater)chooseQuestion(i);}
});
$("answer-list").addEventListener("click",e=>{const b=e.target.closest("[data-answer]");if(b)answerQuestion(Number(b.dataset.answer));});
$("question-continue").addEventListener("click",()=>{$("question-modal").hidden=true;activeQuestion=null;});
$("close-question").addEventListener("click",()=>{$("question-modal").hidden=true;});
$("home-btn").addEventListener("click",()=>{showHomeScreen();});
$("buy-fertilizer").addEventListener("click",()=>{if(save.coins<8){alert("Koin belum cukup.");return;}save.coins-=8;save.fertilizer++;persist();if(game)renderGarden();});
$("costume-list").addEventListener("click",e=>{const b=e.target.closest("[data-costume]");if(b)handleCostume(b.dataset.costume);});
$("open-profile").addEventListener("click",()=>{$("profile-modal").hidden=false;renderProfile();});
$("close-profile").addEventListener("click",()=>{$("profile-modal").hidden=true;});
renderLevels();renderSeedShop();renderProfile();updateTop();
