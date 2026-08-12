/* OpenClaw chat widget — self-contained, no dependencies.
   Configure by setting window.OPENCLAW before this script runs:

   <script>
     window.OPENCLAW = {
       endpoint: "https://YOUR-openclaw.netlify.app/.netlify/functions/chat",
       brand:    "foam",                 // "foam" | "darty"
       name:     "Foam Nation",
       accent:   "#22c1e6",              // bubble + accents
       greeting: "Hey! Ask me anything about the July 25 foam fest 🫧"
     };
   </script>
   <script src="openclaw.js"></script>
*/
(function () {
  var CFG = window.OPENCLAW || {};
  // Only mount if a REAL https endpoint is configured. A leftover placeholder
  // (e.g. "PASTE_YOUR_..._HERE") is truthy but not a URL, and would render a
  // bubble that fails every message — so require a proper http(s) URL.
  if (!CFG.endpoint || !/^https?:\/\//i.test(CFG.endpoint)) { console.warn("[OpenClaw] no valid endpoint configured — widget disabled"); return; }
  var ACCENT = CFG.accent || "#22c1e6";
  var NAME = CFG.name || "Assistant";
  var GREETING = CFG.greeting || ("Hey! Ask me anything about " + NAME + ".");
  var history = [];

  var css = "" +
    ".oc-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:" + ACCENT + ";color:#fff;box-shadow:0 8px 28px rgba(0,0,0,.28);font-size:26px;display:flex;align-items:center;justify-content:center;transition:transform .15s}" +
    ".oc-btn:hover{transform:scale(1.06)}" +
    ".oc-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);background:#12141a;border:1px solid rgba(255,255,255,.08);border-radius:18px;box-shadow:0 20px 60px rgba(0,0,0,.5);display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
    ".oc-panel.open{display:flex}" +
    ".oc-head{padding:14px 16px;background:" + ACCENT + ";color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px}" +
    ".oc-head .oc-x{margin-left:auto;cursor:pointer;opacity:.85;font-size:20px;line-height:1;background:none;border:none;color:#fff}" +
    ".oc-body{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#12141a}" +
    ".oc-msg{max-width:82%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}" +
    ".oc-bot{align-self:flex-start;background:#22252e;color:#eef1f6;border-bottom-left-radius:4px}" +
    ".oc-user{align-self:flex-end;background:" + ACCENT + ";color:#fff;border-bottom-right-radius:4px}" +
    ".oc-bot a{color:" + ACCENT + ";font-weight:600}" +
    ".oc-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(255,255,255,.08);background:#12141a}" +
    ".oc-in{flex:1;background:#1c1f27;border:1px solid rgba(255,255,255,.1);color:#fff;border-radius:12px;padding:10px 12px;font-size:14px;outline:none}" +
    ".oc-send{background:" + ACCENT + ";border:none;color:#fff;border-radius:12px;padding:0 15px;font-weight:700;cursor:pointer}" +
    ".oc-send:disabled{opacity:.5;cursor:default}" +
    ".oc-dots{align-self:flex-start;color:#8b93a3;font-size:14px;padding:6px 4px}" +
    ".oc-credit{text-align:center;font-size:10px;color:#5a6272;padding:0 0 8px}";
  var style = document.createElement("style"); style.textContent = css; document.head.appendChild(style);

  var btn = document.createElement("button");
  btn.className = "oc-btn"; btn.setAttribute("aria-label", "Chat with " + NAME); btn.innerHTML = "&#128172;";
  var panel = document.createElement("div"); panel.className = "oc-panel";
  panel.innerHTML =
    '<div class="oc-head">' + esc(NAME) + '<button class="oc-x" aria-label="Close">&times;</button></div>' +
    '<div class="oc-body"></div>' +
    '<div class="oc-credit">Powered by OpenClaw</div>' +
    '<div class="oc-foot"><input class="oc-in" placeholder="Type a message..." autocomplete="off"/><button class="oc-send">Send</button></div>';
  document.body.appendChild(btn); document.body.appendChild(panel);

  var body = panel.querySelector(".oc-body");
  var input = panel.querySelector(".oc-in");
  var send = panel.querySelector(".oc-send");
  var opened = false;

  function esc(s){var d=document.createElement("div");d.textContent=s;return d.innerHTML;}
  // Turn bare URLs into links; escape everything else.
  function fmt(s){
    return esc(s).replace(/(https?:\/\/[^\s]+)/g, function(u){
      var clean=u.replace(/[.,)]+$/,"");
      return '<a href="'+clean+'" target="_blank" rel="noopener">'+clean+'</a>';
    });
  }
  function add(text, who){
    var d=document.createElement("div"); d.className="oc-msg "+(who==="user"?"oc-user":"oc-bot");
    d.innerHTML = who==="user" ? esc(text) : fmt(text);
    body.appendChild(d); body.scrollTop=body.scrollHeight; return d;
  }
  function toggle(open){
    opened = open; panel.classList.toggle("open", open);
    if(open){
      if(!body.childElementCount) add(GREETING,"bot");
      setTimeout(function(){input.focus();},50);
    }
  }
  btn.addEventListener("click", function(){ toggle(!opened); });
  panel.querySelector(".oc-x").addEventListener("click", function(){ toggle(false); });

  async function submit(){
    var text=(input.value||"").trim(); if(!text) return;
    input.value=""; add(text,"user"); history.push({role:"user",content:text});
    send.disabled=true;
    var dots=document.createElement("div"); dots.className="oc-dots"; dots.textContent="typing…";
    body.appendChild(dots); body.scrollTop=body.scrollHeight;
    try{
      var res=await fetch(CFG.endpoint,{method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({brand:CFG.brand||"foam",message:text,history:history.slice(-6)})});
      var data=await res.json();
      dots.remove();
      var reply=data.reply || ("Sorry, I had a hiccup. Reach us at " + (CFG.site||"our website") + " and we'll help.");
      add(reply,"bot"); history.push({role:"assistant",content:reply});
    }catch(e){
      dots.remove();
      add("Sorry, chat is having trouble right now. Reach us at " + (CFG.site || "our website") + " or DM us on Instagram and we'll help.","bot");
    }finally{ send.disabled=false; input.focus(); }
  }
  send.addEventListener("click", submit);
  input.addEventListener("keydown", function(e){ if(e.key==="Enter") submit(); });
})();
