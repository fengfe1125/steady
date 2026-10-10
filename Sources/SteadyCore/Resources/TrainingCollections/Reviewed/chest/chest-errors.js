/* Topic-owned posture comparisons. These are supplementary coaching diagrams. */
(() => {
  'use strict';
  const C=n=>`var(--color-${n})`;
  const stroke=(points,color=C('skin'),width=15)=>`<path d="${points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;
  const head=(x,y)=>`<ellipse cx="${x}" cy="${y}" rx="12" ry="15" fill="${C('skin')}"/><path d="M${x-12} ${y-4}q-2-21 15-16l9 12" fill="${C('machine-dark')}"/>`;
  const torso=(points)=>stroke(points,C('shirt'),26);
  const legs=(points)=>stroke(points,C('trousers'),17);
  const label=(x,y,text)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="14" fill="${C('muted')}">${text}</text>`;
  const guide=(points)=>`<path d="${points.map((p,i)=>(i?'L':'M')+p.join(' ')).join('')}" stroke="${C('accent')}" stroke-width="2" stroke-dasharray="5 4" fill="none"/>`;
  const symbols=`<path d="M68 242l8 8 14-18" stroke="${C('accent')}" stroke-width="3" fill="none"/><path d="M267 236l16 16m0-16-16 16" stroke="${C('warning')}" stroke-width="3"/>`;
  function press(){
    let s='';
    for(const x of [90,270])s+=stroke([[x-15,90],[x-15,190]],C('pad'),16)+legs([[x,173],[x+39,192],[x+40,225]]);
    s+=torso([[90,172],[90,110]])+head(91,80)+stroke([[90,110],[119,143],[146,112]])+guide([[74,88],[74,184]]);
    s+=torso([[270,172],[297,91]])+head(309,63)+stroke([[297,91],[320,125],[332,95]])+guide([[255,88],[255,184]]);
    return label(86,32,'肩背稳定')+label(274,32,'不要耸肩前顶')+s;
  }
  function dip(){
    let s='';for(const x of [90,280])s+=stroke([[x-33,220],[x-33,125],[x+25,125]],C('machine'),7);
    s+=torso([[63,172],[83,96]])+head(94,65)+stroke([[83,96],[47,116],[88,125]])+legs([[63,172],[103,197],[75,226]]);
    s+=torso([[247,205],[286,159]])+head(298,129)+stroke([[286,159],[246,117],[278,125]])+legs([[247,205],[283,222],[260,235]]);
    s+=guide([[33,95],[120,95]])+guide([[223,125],[326,125]]);
    return label(85,32,'可控深度')+label(276,32,'不硬追求下沉')+s;
  }
  function cable(){
    const s=torso([[87,190],[87,105]])+head(88,75)+stroke([[87,110],[118,111],[145,126]])+stroke([[82,109],[48,110],[23,127]])
      +torso([[275,190],[275,105]])+head(276,75)+stroke([[275,110],[313,145],[313,91]])+stroke([[270,109],[234,145],[234,91]])
      +guide([[85,107],[145,128]])+stroke([[12,207],[24,128]],C('machine'),2)+stroke([[166,207],[144,127]],C('machine'),2);
    return label(86,32,'肘部保留微屈')+label(275,32,'别反复卷肘')+s;
  }
  function wall(){
    let s='';for(const x of [151,339])s+=stroke([[x,59],[x,227]],C('machine-light'),9);
    s+=head(61,72)+torso([[72,102],[92,151]])+legs([[92,151],[105,188],[120,226]])+stroke([[72,102],[102,131],[146,105]])+guide([[64,86],[120,226]]);
    s+=head(249,72)+torso([[260,103],[302,136],[322,160]])+legs([[322,160],[298,192],[309,226]])+stroke([[260,103],[290,131],[334,105]])+guide([[252,86],[309,226]]);
    return label(87,32,'躯干整体移动')+label(276,32,'不要塌腰')+s;
  }
  function roller(){
    let s='';for(const x of [116,306])s+=stroke([[x-24,167],[x+22,167]],C('pad'),26)+stroke([[x-62,224],[x+44,224]],C('soft'),3);
    s+=torso([[24,158],[70,153],[121,144]])+head(145,136)+stroke([[113,145],[99,183],[135,190]])+legs([[25,158],[7,171]])+guide([[22,151],[126,139]]);
    s+=torso([[215,160],[254,109],[308,144]])+head(333,119)+stroke([[304,144],[289,183],[325,190]])+legs([[215,160],[195,171]]);
    return label(86,32,'胸骨接触滚轴')+label(275,32,'勿用腰部硬顶')+s;
  }
  function band(){
    let s=torso([[86,185],[86,102]])+stroke([[58,103],[113,103]],C('shirt'),22)+head(86,74)+legs([[86,185],[70,226]])+legs([[86,185],[101,226]])+stroke([[58,104],[40,76],[26,45]])+stroke([[113,104],[132,76],[145,45]])+stroke([[26,45],[145,45]],C('band'),3);
    s+=torso([[270,185],[255,145],[274,109]])+stroke([[249,113],[300,108]],C('shirt'),22)+head(283,79)+legs([[270,185],[254,226]])+legs([[270,185],[288,226]])+stroke([[249,113],[252,77],[266,44]])+stroke([[300,108],[294,76],[284,44]])+stroke([[266,44],[284,44]],C('band'),3);
    return label(86,32,'宽握且躯干稳定')+label(274,32,'别窄握硬绕')+s;
  }
  function march(){
    let s=torso([[86,170],[86,101]])+stroke([[61,103],[110,103]],C('shirt'),22)+head(86,72)+legs([[83,170],[64,196],[79,216]])+legs([[89,170],[98,224]])+stroke([[61,103],[42,148],[65,169]])+stroke([[110,103],[134,140],[113,158]]);
    s+=torso([[276,161],[271,92]])+stroke([[248,97],[298,96]],C('shirt'),22)+head(270,62)+legs([[272,161],[242,179],[259,194]])+legs([[280,161],[310,178],[314,205]])+stroke([[248,97],[236,66],[251,40]])+stroke([[298,96],[321,64],[303,44]]);
    return label(86,32,'小幅轻松踏步')+label(275,32,'别急着跑跳')+s;
  }
  window.SteadyChestErrors={render(kind,target='errors'){
    const body=(kind==='dip'?dip:kind==='cable'?cable:kind==='wall'?wall:kind.startsWith('roller')?roller:kind==='band'?band:kind==='march'?march:press)();
    document.getElementById(target).innerHTML=body+symbols;
    return body+symbols;
  }};
})();
