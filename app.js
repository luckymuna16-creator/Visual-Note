const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const KEY="studycanvas_v2";let data=JSON.parse(localStorage.getItem(KEY)||"null")||{boards:[{name:"My Study Board",nodes:[],links:[]}],active:0,pin:"",theme:"light"};
let undo=[],redo=[],connect=false,pan={x:0,y:0,scale:1},panning=false,panStart={x:0,y:0,ox:0,oy:0},study=false;

function board(){return data.boards[data.active]} function id(){return Math.random().toString(36).slice(2,10)}
function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function snapshot(){undo.push(JSON.stringify(data));if(undo.length>40)undo.shift();redo=[];save()}
function restore(s){data=JSON.parse(s);render();save()}
function toast(t){let x=$("#toast");x.textContent=t;x.style.display="block";clearTimeout(window.tt);window.tt=setTimeout(()=>x.style.display="none",1600)}
function esc(s){return String(s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]))}

function renderBoards(){$("#boardList").innerHTML=data.boards.map((b,i)=>`<button data-b="${i}">${i===data.active?"● ":""}${esc(b.name)}</button>`).join("");$$("[data-b]").forEach(b=>b.onclick=()=>{data.active=+b.dataset.b;save();render();renderBoards();$("#drawer").classList.add("hidden")})}
function render(){
 $("#board").querySelectorAll(".node").forEach(x=>x.remove());board().nodes.forEach(makeNode);drawLinks();updateStats();applyTheme()
}
function makeNode(n){
 let e=document.createElement("article");e.className="node "+n.type+(n.locked?" locked":"");e.dataset.id=n.id;e.style.left=n.x+"px";e.style.top=n.y+"px";
 let content="";
 if(n.type==="image")content=`<img src="${n.src}"><div class="caption">${esc(n.caption||"Image note")}</div><div class="imageTools"><button class="annotate">✎ Annotate</button></div>`;
 else if(n.type==="draw")content=`<canvas width="600" height="350"></canvas>`;
 else if(n.type==="resource")content=`<div class="edit" contenteditable="true">${esc(n.title||"Resource")}</div><div class="caption"><a href="${esc(n.url||"")}" target="_blank">${esc(n.url||"Paste a URL")}</a></div>`;
 else if(n.type==="pdf")content=`<div class="pdfbox"><b>📄 ${esc(n.name||"PDF")}</b>${n.src?`<iframe src="${n.src}"></iframe>`:"<div class='caption'>PDF attached to this concept. Tap Edit to choose a file.</div>"}</div>`;
 else content=`<div class="edit" contenteditable="true">${n.content||""}</div>`;
 e.innerHTML=`<div class="bar"><span class="drag">⋮⋮ ${n.type.toUpperCase()}</span><span class="nodeBtns"><button class="editBtn">✎</button><button class="linkBtn">↗</button><button class="lockBtn">🔒</button><button class="del">×</button></span></div>${content}${(n.tags||[]).map(t=>`<span class="tag">#${esc(t)}</span>`).join("")}`;
 $("#board").append(e);
 e.querySelector(".del").onclick=()=>{snapshot();board().nodes=board().nodes.filter(x=>x.id!==n.id);board().links=board().links.filter(l=>l.a!==n.id&&l.b!==n.id);render()};
 e.querySelector(".lockBtn").onclick=()=>{snapshot();n.locked=!n.locked;render();toast(n.locked?"Card locked":"Card unlocked")};
 e.querySelector(".linkBtn").onclick=()=>startConnect(n.id);
 e.querySelector(".editBtn").onclick=()=>editCard(n);
 let ed=e.querySelector(".edit");if(ed)ed.oninput=()=>{n.content=ed.innerHTML;save()};
 if(n.type==="draw")setupDraw(e.querySelector("canvas"),n);
 if(n.type==="image")e.querySelector(".annotate").onclick=()=>annotateImage(n);
 drag(e,n);
}
function drag(e,n){let m=false,sx,sy,ox,oy;e.querySelector(".drag").onpointerdown=a=>{m=true;sx=a.clientX;sy=a.clientY;ox=n.x;oy=n.y;e.setPointerCapture(a.pointerId)};e.onpointermove=a=>{if(!m)return;n.x=ox+(a.clientX-sx)/pan.scale;n.y=oy+(a.clientY-sy)/pan.scale;e.style.left=n.x+"px";e.style.top=n.y+"px";drawLinks()};e.onpointerup=()=>{if(m){m=false;save()}}}
function setupDraw(c,n){let ctx=c.getContext("2d"),drawing=false;ctx.lineWidth=4;ctx.lineCap="round";c.onpointerdown=e=>{drawing=true;let r=c.getBoundingClientRect();ctx.beginPath();ctx.moveTo((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height);c.setPointerCapture(e.pointerId)};c.onpointermove=e=>{if(!drawing)return;let r=c.getBoundingClientRect();ctx.lineTo((e.clientX-r.left)*c.width/r.width,(e.clientY-r.top)*c.height/r.height);ctx.stroke()};c.onpointerup=()=>{drawing=false;n.drawing=c.toDataURL();save()};if(n.drawing){let im=new Image;im.onload=()=>ctx.drawImage(im,0,0);im.src=n.drawing}}
function add(type,extra={}){snapshot();let n={id:id(),type,x:200+Math.random()*450,y:150+Math.random()*400,content:"",tags:[],...extra};board().nodes.push(n);render();toast(type+" card added")}
function editCard(n){
 if(n.type==="image"){let c=prompt("Caption:",n.caption||"");if(c!==null){snapshot();n.caption=c;render()}return}
 if(n.type==="resource"){let title=prompt("Resource title:",n.title||"");if(title===null)return;let url=prompt("URL:",n.url||"");snapshot();n.title=title;n.url=url;render();return}
 if(n.type==="pdf"){let input=document.createElement("input");input.type="file";input.accept=".pdf";input.onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>{snapshot();n.src=r.result;n.name=f.name;render()};r.readAsDataURL(f)};input.click();return}
 let tags=prompt("Tags (comma separated):",(n.tags||[]).join(", "));if(tags!==null){snapshot();n.tags=tags.split(",").map(x=>x.trim()).filter(Boolean);render()}
}
function annotateImage(n){let note=prompt("Annotation / what should you notice?",n.annotation||"");if(note!==null){snapshot();n.annotation=note;n.caption=note;render()}}
function startConnect(from){connect=from;toast("Now tap another card to connect");$$(".node").forEach(e=>e.classList.toggle("selected",e.dataset.id===from))}
function drawLinks(){
 let s=$("#svg");s.innerHTML=`<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4.5" orient="auto"><path d="M0,0 L9,4.5 L0,9z" fill="#7a8498"/></marker></defs>`;
 board().links.forEach(l=>{let a=board().nodes.find(x=>x.id===l.a),b=board().nodes.find(x=>x.id===l.b);if(!a||!b)return;let A=document.querySelector(`[data-id="${a.id}"]`),B=document.querySelector(`[data-id="${b.id}"]`);let x1=a.x+A.offsetWidth/2,y1=a.y+A.offsetHeight/2,x2=b.x+B.offsetWidth/2,y2=b.y+B.offsetHeight/2;let line=document.createElementNS("http://www.w3.org/2000/svg","path");let cx=(x1+x2)/2,cy=(y1+y2)/2-40;line.setAttribute("d",`M${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`);line.setAttribute("class","edge "+(l.style==="dashed"?"dashed":""));s.append(line)})}
$("#board").addEventListener("click",e=>{let node=e.target.closest(".node");if(connect&&node&&node.dataset.id!==connect){snapshot();board().links.push({a:connect,b:node.dataset.id,style:"solid"});connect=null;render();toast("Concepts connected")}})
$$("[data-add]").forEach(b=>b.onclick=()=>{
 let t=b.dataset.add;
 if(t==="image"){let i=document.createElement("input");i.type="file";i.accept="image/*";i.onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>add("image",{src:r.result,caption:f.name});r.readAsDataURL(f)};i.click()}
 else if(t==="pdf"){let i=document.createElement("input");i.type="file";i.accept=".pdf";i.onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>add("pdf",{src:r.result,name:f.name});r.readAsDataURL(f)};i.click()}
 else add(t==="heading"?"heading":t,{content:t==="code"?"// Start coding here\n":"Click here and write…"});
});
$("#connect").onclick=()=>{connect=null;toast("Tap a card, then tap the card it should lead to")};
$("#menu").onclick=()=>$("#drawer").classList.remove("hidden");$("#close").onclick=()=>$("#drawer").classList.add("hidden");
$("#newBoard").onclick=()=>{let n=prompt("Board name?","Physics");if(n){snapshot();data.boards.push({name:n,nodes:[],links:[]});data.active=data.boards.length-1;save();render();renderBoards()}};
$("#themeBtn").onclick=()=>{data.theme=data.theme==="dark"?"light":"dark";save();applyTheme()};
function applyTheme(){document.body.classList.toggle("dark",data.theme==="dark")}
$("#study").onclick=()=>{study=!study;document.body.classList.toggle("studyMode",study);toast(study?"Study mode on — select a concept":"Study mode off")};
$("#searchBtn").onclick=()=>{$("#searchBox").classList.remove("hidden");$("#search").focus()};$("#searchClose").onclick=()=>$("#searchBox").classList.add("hidden");
$("#search").oninput=()=>{let q=$("#search").value.toLowerCase(),r=[];data.boards.forEach((b,bi)=>b.nodes.forEach(n=>{let txt=(n.content+" "+n.caption+" "+n.annotation+" "+(n.tags||[]).join(" ")).toLowerCase();if(q&&txt.includes(q))r.push({bi,n})}));$("#results").innerHTML=r.map(x=>`<div class="result" data-r="${x.bi}" data-n="${x.n.id}"><b>${esc(x.n.type)}</b><small>${esc((x.n.content||x.n.caption||x.n.annotation||"").replace(/<[^>]+>/g,"").slice(0,120))}</small></div>`).join("")||"<p>No matches.</p>";$$("[data-r]").forEach(e=>e.onclick=()=>{data.active=+e.dataset.r;save();render();$("#searchBox").classList.add("hidden")})};
$("#backup").onclick=()=>{let a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:"application/json"}));a.download="studycanvas-backup.json";a.click()};
$("#restore").onclick=()=>$("#import").click();$("#import").onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader;r.onload=()=>{try{snapshot();data=JSON.parse(r.result);save();render();renderBoards();toast("Backup restored")}catch{toast("Invalid backup")}};r.readAsText(f)};
$("#lockBtn").onclick=()=>{if(!data.pin){let p=prompt("Create a 4–8 digit PIN");if(p&&/^\d{4,8}$/.test(p)){data.pin=p;save();toast("PIN created")}}else $("#lock").classList.remove("hidden")};
$("#unlock").onclick=()=>{if($("#pin").value===data.pin){$("#lock").classList.add("hidden");$("#pinMsg").textContent=""}else $("#pinMsg").textContent="Wrong PIN"};
$("#viewport").addEventListener("wheel",e=>{if(e.ctrlKey||e.metaKey){e.preventDefault();pan.scale=Math.min(2.2,Math.max(.45,pan.scale*(e.deltaY<0?1.08:.92)));$("#board").style.transform=`translate(${pan.x}px,${pan.y}px) scale(${pan.scale})`}});
$("#viewport").addEventListener("pointerdown",e=>{if(e.target.closest(".node"))return;panning=true;panStart={x:e.clientX,y:e.clientY,ox:pan.x,oy:pan.y};$("#viewport").setPointerCapture(e.pointerId)});
$("#viewport").addEventListener("pointermove",e=>{if(!panning)return;pan.x=panStart.ox+e.clientX-panStart.x;pan.y=panStart.oy+e.clientY-panStart.y;$("#board").style.transform=`translate(${pan.x}px,${pan.y}px) scale(${pan.scale})`});
$("#viewport").addEventListener("pointerup",()=>panning=false);
document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="z"){e.preventDefault();if(undo.length){redo.push(JSON.stringify(data));restore(undo.pop())}}if((e.ctrlKey||e.metaKey)&&e.key==="y"){e.preventDefault();if(redo.length){undo.push(JSON.stringify(data));restore(redo.pop())}}});
function updateStats(){let b=board();$("#stats").innerHTML=`<b>${esc(b.name)}</b><br>${b.nodes.length} cards · ${b.links.length} connections<br>${b.nodes.filter(n=>n.type==="code").length} code · ${b.nodes.filter(n=>n.type==="image").length} images · ${b.nodes.filter(n=>n.type==="pdf").length} PDFs`}

/* v3 additive features: keeps all v2 behavior intact */
const v3Tools=document.createElement("div");
v3Tools.id="v3tools";
v3Tools.innerHTML=`<button id="fitCanvas">⊞ Fit</button><button id="centerCanvas">⌖ Center</button><button id="quickCapture">⚡ Quick note</button><button id="focusCard">🎯 Focus card</button>`;
document.querySelector(".tools").appendChild(v3Tools);

$("#quickCapture").onclick=()=>{
  let t=prompt("Quick note:");
  if(t){snapshot();add("text",{content:esc(t)});toast("Quick note added")}
};
$("#focusCard").onclick=()=>{
  let cards=[...$$(".node")];
  cards.forEach(x=>x.classList.remove("selected"));
  let q=prompt("Search for a concept to focus:");
  if(!q)return;
  let n=board().nodes.find(n=>(n.content+" "+n.caption+" "+n.annotation+" "+(n.tags||[]).join(" ")).toLowerCase().includes(q.toLowerCase()));
  if(n){let e=document.querySelector(`[data-id="${n.id}"]`);e?.classList.add("selected");toast("Focused on "+q)}
  else toast("Concept not found");
};
$("#centerCanvas").onclick=()=>{pan={x:0,y:0,scale:1};$("#board").style.transform="translate(0px,0px) scale(1)";toast("Canvas centered")};
$("#fitCanvas").onclick=()=>{
  let ns=board().nodes;
  if(!ns.length){toast("Board is empty");return}
  let minX=Math.min(...ns.map(n=>n.x)),maxX=Math.max(...ns.map(n=>n.x+285)),minY=Math.min(...ns.map(n=>n.y)),maxY=Math.max(...ns.map(n=>n.y+150));
  let vw=$("#viewport").clientWidth,vh=$("#viewport").clientHeight;
  let scale=Math.min(1.15,vw/(maxX-minX+100),vh/(maxY-minY+100));
  scale=Math.max(.45,scale);
  pan.x=(vw-(maxX-minX)*scale)/2-minX*scale;
  pan.y=(vh-(maxY-minY)*scale)/2-minY*scale;
  $("#board").style.transform=`translate(${pan.x}px,${pan.y}px) scale(${scale})`;toast("Board fitted")
};

document.addEventListener("dblclick",e=>{
  if(e.target.closest(".node")||e.target.closest("button"))return;
  let r=$("#viewport").getBoundingClientRect(),x=(e.clientX-r.left-pan.x)/pan.scale,y=(e.clientY-r.top-pan.y)/pan.scale;
  add("text",{x,y,content:"Click here and write…"});
});

document.addEventListener("keydown",e=>{
  if(e.key==="Escape"){connect=null;$$(".node").forEach(n=>n.classList.remove("selected"))}
});

renderBoards();render();
if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js");
