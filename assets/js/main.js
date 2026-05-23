(function () {
"use strict";

/* ════════════════════════════════════════════
   LOADER
   ════════════════════════════════════════════ */
const loader    = document.getElementById('loader');
const loaderTxt = document.getElementById('loader-text');
const loaderPct = document.getElementById('loader-pct');
const loaderBar = loader && loader.querySelector('.loader__bar::after');

const messages = ['Booting...','Loading assets...','Decrypting...','Almost ready...'];
let pct = 0;
function animateLoader(){
  const iv = setInterval(()=>{
    pct += Math.random()*18 + 4;
    if(pct > 100) pct = 100;
    if(loaderPct) loaderPct.textContent = Math.round(pct)+'%';
    // move bar via CSS var trick
    if(loader) loader.querySelector('.loader__bar').style.setProperty('--w', pct+'%');
    const msg = messages[Math.floor((pct/100)*messages.length)] || messages[messages.length-1];
    if(loaderTxt) loaderTxt.textContent = msg;
    if(pct >= 100){
      clearInterval(iv);
      setTimeout(()=>{
        if(loader) loader.classList.add('hidden');
      }, 320);
    }
  }, 90);
}
// set bar width via inline style override
if(loader){
  const bar = loader.querySelector('.loader__bar');
  const style = document.createElement('style');
  style.textContent=`.loader__bar::after{width:var(--w,0%)}`;
  document.head.appendChild(style);
  animateLoader();
}

/* ════════════════════════════════════════════
   THEME
   ════════════════════════════════════════════ */
const html  = document.documentElement;
const tog   = document.getElementById('tog');
const saved = localStorage.getItem('theme') || 'dark';
html.setAttribute('data-theme', saved);
if(tog){
  tog.addEventListener('click', ()=>{
    const next = html.getAttribute('data-theme')==='dark'?'light':'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
  });
}

/* ════════════════════════════════════════════
   SCROLL PROGRESS BAR
   ════════════════════════════════════════════ */
const scrollBar = document.createElement('div');
scrollBar.className = 'scroll-bar';
document.body.prepend(scrollBar);
window.addEventListener('scroll',()=>{
  const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
  scrollBar.style.width = pct + '%';
},{passive:true});

/* ════════════════════════════════════════════
   MOBILE NAV
   ════════════════════════════════════════════ */
const burger   = document.getElementById('burger');
const navLinks = document.getElementById('nav-links');
if(burger && navLinks){
  burger.addEventListener('click',()=>{
    const open = navLinks.classList.toggle('open');
    burger.classList.toggle('open', open);
  });
  navLinks.querySelectorAll('a').forEach(a=>
    a.addEventListener('click',()=>{
      navLinks.classList.remove('open');
      burger.classList.remove('open');
    })
  );
}

/* ════════════════════════════════════════════
   ACTIVE NAV LINK
   ════════════════════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const navAs    = document.querySelectorAll('.nav__links a[href^="#"]');
function setActive(){
  const y = window.scrollY + 130;
  sections.forEach(s=>{
    if(y>=s.offsetTop && y<s.offsetTop+s.offsetHeight)
      navAs.forEach(a=>a.classList.toggle('active', a.getAttribute('href')==='#'+s.id));
  });
}
window.addEventListener('scroll', setActive, {passive:true});

/* ════════════════════════════════════════════
   SCROLL REVEAL
   ════════════════════════════════════════════ */
const reveals = document.querySelectorAll('.reveal');
const rio = new IntersectionObserver(
  es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');rio.unobserve(e.target);}}),
  {threshold:.07, rootMargin:'0px 0px -50px 0px'}
);
reveals.forEach(el=>rio.observe(el));

/* ════════════════════════════════════════════
   SECTION HEADING SCROLL PARALLAX
   ════════════════════════════════════════════ */
const parallaxEls = document.querySelectorAll('[data-parallax]');
function doParallax(){
  parallaxEls.forEach(el=>{
    const r   = el.getBoundingClientRect();
    const mid = r.top + r.height/2;
    const vy  = window.innerHeight/2;
    const d   = ((mid - vy) / vy) * 12; // max 12px shift
    el.style.transform = `translateY(${d}px)`;
  });
}
window.addEventListener('scroll', doParallax, {passive:true});

/* ════════════════════════════════════════════
   EXPERIENCE SLIDER — smooth CSS transition
   ════════════════════════════════════════════ */
(function(){
  const track = document.getElementById('exp-track');
  const prev  = document.getElementById('exp-prev');
  const next  = document.getElementById('exp-next');
  const curEl = document.getElementById('exp-cur');
  const bar   = document.querySelector('.exp-progress__bar');
  if(!track||!prev||!next) return;

  const slides = Array.from(track.querySelectorAll('.exp-slide'));
  const total  = slides.length;
  let cur = 0;

  function slideW(){ return slides[0].offsetWidth + 24; }
  function perV(){ return window.innerWidth<=768?1:2; }
  function maxIdx(){ return Math.max(0,total-perV()); }

  function setActive(i){
    slides.forEach((s,j)=>s.classList.toggle('is-active', perV()===2?j===i||j===i+1:j===i));
  }

  function goTo(i){
    i = Math.max(0,Math.min(i,maxIdx()));
    cur = i;
    track.classList.add('snap-anim');
    track.style.transform=`translateX(${-cur*slideW()}px)`;
    setTimeout(()=>track.classList.remove('snap-anim'),540);
    if(curEl) curEl.textContent = cur+1;
    if(bar) bar.style.width = ((cur+perV())/total*100)+'%';
    prev.disabled = cur===0;
    next.disabled = cur>=maxIdx();
    setActive(cur);
  }

  prev.addEventListener('click',()=>goTo(cur-1));
  next.addEventListener('click',()=>goTo(cur+1));
  window.addEventListener('resize',()=>goTo(Math.min(cur,maxIdx())),{passive:true});

  // drag
  let dragStart=null,dragX=0;
  track.addEventListener('pointerdown',e=>{dragStart=e.clientX;dragX=0;track.classList.add('is-grabbing');track.setPointerCapture(e.pointerId);});
  track.addEventListener('pointermove',e=>{
    if(dragStart===null) return;
    dragX=dragStart-e.clientX;
    track.style.transform=`translateX(${-(cur*slideW()+dragX)}px)`;
  });
  track.addEventListener('pointerup',()=>{
    track.classList.remove('is-grabbing');
    if(dragStart===null) return;
    dragStart=null;
    if(Math.abs(dragX)>slideW()*.28) goTo(dragX>0?cur+1:cur-1);
    else goTo(cur);
  });

  goTo(0);
})();

/* ════════════════════════════════════════════
   CURSOR PARALLAX ON VIDEO — spring
   ════════════════════════════════════════════ */
(function(){
  const video=document.querySelector('.vbg video');
  if(!video) return;
  let tx=0,ty=0,cx=0,cy=0;
  const s=0.055, MAX=12;
  window.addEventListener('mousemove',e=>{
    tx=(e.clientX/window.innerWidth -.5)*-MAX;
    ty=(e.clientY/window.innerHeight-.5)*-MAX;
  },{passive:true});
  window.addEventListener('mouseleave',()=>{tx=0;ty=0;});
  (function loop(){
    cx+=(tx-cx)*s; cy+=(ty-cy)*s;
    video.style.transform=`translate(${cx}px,${cy}px) scale(1.04)`;
    requestAnimationFrame(loop);
  })();
})();

/* ════════════════════════════════════════════
   INTERACTIVE EFFECTS
   ════════════════════════════════════════════ */
(function(){

  /* Custom cursor */
  const dot  = document.createElement('div'); dot.className='cursor-dot';
  const ring = document.createElement('div'); ring.className='cursor-ring';
  document.body.append(dot,ring);
  let mx=0,my=0,rx=0,ry=0;
  window.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;},{passive:true});
  (function loop(){
    dot.style.left=mx+'px'; dot.style.top=my+'px';
    rx+=(mx-rx)*.1; ry+=(my-ry)*.1;
    ring.style.left=rx+'px'; ring.style.top=ry+'px';
    requestAnimationFrame(loop);
  })();
  document.querySelectorAll('a,button,.proj-flip,.tilt-card,.tags span').forEach(el=>{
    el.addEventListener('mouseenter',()=>{ring.style.transform='translate(-50%,-50%) scale(2.2)';ring.style.opacity='.2';});
    el.addEventListener('mouseleave',()=>{ring.style.transform='translate(-50%,-50%) scale(1)';ring.style.opacity='.5';});
  });

  /* 3D tilt on stat nums */
  document.querySelectorAll('.tilt-card').forEach(card=>{
    card.addEventListener('mousemove',e=>{
      const r=card.getBoundingClientRect();
      const x=((e.clientX-r.left)/r.width-.5)*20;
      const y=((e.clientY-r.top)/r.height-.5)*-20;
      card.style.transform=`perspective(400px) rotateX(${y}deg) rotateY(${x}deg) scale(1.06)`;
    });
    card.addEventListener('mouseleave',()=>{card.style.transform='';});
  });

  /* Magnetic CTA */
  document.querySelectorAll('.magnetic').forEach(el=>{
    el.addEventListener('mousemove',e=>{
      const r=el.getBoundingClientRect();
      const dx=(e.clientX-r.left-r.width/2)*.28;
      const dy=(e.clientY-r.top-r.height/2)*.28;
      el.style.transform=`translate(${dx}px,${dy}px)`;
    });
    el.addEventListener('mouseleave',()=>{
      el.style.transition='transform .4s var(--ease)';
      el.style.transform='';
      setTimeout(()=>el.style.transition='',420);
    });
  });

  /* Hero name glitch */
  const name=document.querySelector('.hero__name');
  if(name){
    setInterval(()=>{
      name.classList.add('glitch-active');
      setTimeout(()=>name.classList.remove('glitch-active'),200);
    },5000+Math.random()*3000);
  }

  /* Tag pop */
  document.querySelectorAll('.tags span,.exp-slide__tags span,.proj-flip__tags span').forEach(tag=>{
    tag.addEventListener('click',()=>{
      tag.classList.remove('popped'); void tag.offsetWidth;
      tag.classList.add('popped');
    });
  });

  /* Section title line draw */
  const titles=document.querySelectorAll('.s-title');
  const tio=new IntersectionObserver(es=>{
    es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('line-drawn');tio.unobserve(e.target);}});
  },{threshold:.6});
  titles.forEach(t=>tio.observe(t));

  /* Ripple */
  function addRipple(el){
    el.addEventListener('click',e=>{
      const r=el.getBoundingClientRect();
      const size=Math.max(r.width,r.height)*2;
      const rip=document.createElement('span');
      rip.className='ripple';
      rip.style.cssText=`width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;
      el.appendChild(rip);
      setTimeout(()=>rip.remove(),600);
    });
  }
  document.querySelectorAll('.exp-btn,.cert-btn-about,.nav__links a').forEach(addRipple);

  /* Contact spotlight */
  const cp=document.querySelector('.contact-inner');
  if(cp){
    cp.style.position='relative';cp.style.overflow='hidden';
    const spot=document.createElement('div');spot.className='contact-panel__spotlight';
    spot.style.display='block';
    cp.prepend(spot);
    cp.addEventListener('mousemove',e=>{
      const r=cp.getBoundingClientRect();
      spot.style.left=(e.clientX-r.left)+'px';
      spot.style.top=(e.clientY-r.top)+'px';
    });
    cp.addEventListener('mouseleave',()=>{spot.style.left='-999px';});
  }

  /* Particle burst on flip */
  document.querySelectorAll('.proj-flip').forEach(flip=>{
    let burst=false;
    flip.addEventListener('mouseenter',()=>{
      if(burst) return; burst=true;
      const r=flip.getBoundingClientRect();
      for(let i=0;i<7;i++){
        const p=document.createElement('div');
        p.style.cssText=`position:fixed;left:${r.left+r.width/2}px;top:${r.top+r.height/2}px;width:4px;height:4px;border-radius:50%;background:#C0392B;pointer-events:none;z-index:9999;transform:translate(-50%,-50%)`;
        document.body.appendChild(p);
        const angle=(i/7)*Math.PI*2;
        const dist=55+Math.random()*35;
        p.animate([
          {transform:'translate(-50%,-50%)',opacity:1},
          {transform:`translate(calc(-50% + ${Math.cos(angle)*dist}px),calc(-50% + ${Math.sin(angle)*dist}px))`,opacity:0}
        ],{duration:450+Math.random()*150,easing:'cubic-bezier(.2,0,.8,1)'}).onfinish=()=>p.remove();
      }
    });
    flip.addEventListener('mouseleave',()=>{burst=false;});
  });

  /* Mobile tap to flip */
  document.querySelectorAll('.proj-flip').forEach(card=>{
    card.addEventListener('click',()=>{
      if(window.matchMedia('(hover:none)').matches)
        card.classList.toggle('flipped');
    });
  });

  /* Count-up stats */
  const statNums=document.querySelectorAll('.num__n');
  const cio=new IntersectionObserver(es=>{
    es.forEach(e=>{
      if(!e.isIntersecting) return;
      const el=e.target, raw=el.textContent, n=parseInt(raw);
      if(isNaN(n)){cio.unobserve(el);return;}
      let start=null;
      (function step(ts){
        if(!start) start=ts;
        const p=Math.min((ts-start)/1100,1);
        const ease=1-Math.pow(1-p,3);
        el.textContent=Math.round(ease*n)+(raw.includes('+')?'+':'');
        if(p<1) requestAnimationFrame(step); else el.textContent=raw;
      })(performance.now());
      cio.unobserve(el);
    });
  },{threshold:.8});
  statNums.forEach(n=>cio.observe(n));

})();

})();
