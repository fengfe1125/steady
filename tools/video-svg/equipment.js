/* Source-video machine variants. Hidden transmissions intentionally omitted. */
(()=>{const SA=window.SteadyAnatomy,{el,V}=SA.util;
const line=(g,a,b,w=7,c='var(--frame)')=>el('path',{d:`M${a.x},${a.y}L${b.x},${b.y}`,stroke:c,'stroke-width':w,'stroke-linecap':'round',fill:'none'},g);
const rect=(g,x,y,w,h,c)=>el('rect',{x,y,width:w,height:h,rx:4,fill:c},g);
SA.equipment.types.reference_sled={
 bounds:()=>[V(-150,-265),V(155,6)],
 build(l,c,it){const g=l.back;line(g,V(-145,0),V(145,0),10);line(g,V(108,0),V(108,-170),9);rect(g,106,-163,9,97,'var(--pad)');line(g,V(-130,-87),V(12,-56),5);line(g,V(-130,-76),V(12,-45),5);it.seat=el('g',{},g);rect(it.seat,-24,8,58,9,'var(--pad)');line(it.seat,V(-18,6),V(-58,-99),15,'var(--pad)');line(it.seat,V(-8,20),V(-8,43),9);it.grips=el('g',{},l.front);this.update(c,it);},
 update(c,it){const h=c.joints.hip;it.seat.setAttribute('transform',`translate(${h.x},${h.y})`);it.grips.replaceChildren();for(const s of ['near','far']){const a=c.joints.arms[s].H;line(it.grips,V(a.x-10,a.y),V(a.x+12,a.y),6,'var(--metal-mid)');}}
};
SA.equipment.types.reference_press={
 bounds:()=>[V(-135,-330),V(135,6)],
 build(l,c,it){const g=l.back;line(g,V(-128,0),V(128,0),10);for(const x of [-118,118])line(g,V(x,0),V(x,-300),8);line(g,V(-118,-300),V(118,-300),7);rect(g,-31,-225,62,103,'var(--pad)');rect(g,-54,-117,108,10,'var(--pad)');line(g,V(0,-107),V(0,0),9);it.arms=el('g',{},g);it.handles=el('g',{},l.front);this.update(c,it);},
 update(c,it){it.arms.replaceChildren();it.handles.replaceChildren();for(const side of ['r','l']){const sign=side==='r'?1:-1;const h=c.joints.arms[side].H;line(it.arms,V(sign*35,-265),h,8,'var(--metal-mid)');el('circle',{cx:sign*35,cy:-265,r:7,fill:'var(--metal)'},it.arms);line(it.handles,V(h.x-10,h.y),V(h.x+10,h.y),6,'var(--pad)');}}
};
})();
