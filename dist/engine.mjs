// Independent ternary half-plane solver. Energies are eV per entered formula.
export const ELEMENTS = new Set('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' '));
export function number(value, label) {
  if (value === '' || value === null || value === undefined || (typeof value==='string' && !value.trim()) || !Number.isFinite(Number(value))) throw Error(`${label}: enter a finite number.`);
  return Number(value);
}
export function parseFormula(formula) {
  if (typeof formula !== 'string' || !formula.trim() || formula.length>200) throw Error('Enter a chemical formula, such as SrTiO3.');
  const s=formula.trim(); let i=0;
  const count=()=>{const m=s.slice(i).match(/^(?:\d+(?:\.\d+)?|\.\d+)/);if(!m)return 1;i+=m[0].length;const n=Number(m[0]);if(!(n>0))throw Error('Stoichiometric coefficients must be positive.');return n;};
  function group(nested=false){const out={};let terms=0;while(i<s.length && s[i]!==')'){
    let part;
    if(s[i]==='('){i++;part=group(true);if(s[i]!==')')throw Error('Unmatched parentheses in formula.');i++;}
    else {const m=s.slice(i).match(/^[A-Z][a-z]?/);if(!m || !ELEMENTS.has(m[0]))throw Error(`Invalid formula near “${s.slice(i)}”. Use element symbols and positive counts.`);i+=m[0].length;part={[m[0]]:1};}
    const n=count();for(const [e,c] of Object.entries(part))out[e]=(out[e]||0)+c*n;terms++;
  }if(!terms)throw Error('Empty formula group.');return out;}
  const result=group();if(i!==s.length)throw Error('Unmatched parentheses in formula.');
  if(Object.values(result).some(x=>!Number.isFinite(x)||x>1e6))throw Error('Stoichiometry is too large.');return result;
}
export function energyPerFormula(row,mode,refs,composition) {
  let energy=number(row.energy,`${row.formula} energy`);
  if(row.basis==='atom')energy*=Object.values(composition).reduce((a,b)=>a+b,0);
  else if(row.basis==='cell'){const units=number(row.units,`${row.formula} formula units per cell`);if(units<=0)throw Error('Formula units per cell must be positive.');energy/=units;}
  else if(row.basis && row.basis!=='formula')throw Error('Unknown energy basis.');
  if(mode==='total')for(const [e,n]of Object.entries(composition))energy-=n*number(refs[e],`${e} reference energy (eV/atom)`);
  if(!Number.isFinite(energy))throw Error('Energy normalization overflow.');return energy;
}
export function solve(model) {
  if(!['formation','total'].includes(model.mode))throw Error('Choose formation enthalpies or total energies.');
  const composition=parseFormula(model.target.formula), elements=Object.keys(composition);
  if(elements.length!==3)throw Error('The target must contain exactly three distinct elements.');
  const eliminated=model.eliminated||elements[2];if(!elements.includes(eliminated))throw Error('Eliminated element must belong to the target.');
  const [x,y]=elements.filter(e=>e!==eliminated), z=eliminated, a=composition[x],b=composition[y],c=composition[z];
  const h=energyPerFormula(model.target,model.mode,model.refs||{},composition);
  if(!Array.isArray(model.phases)||model.phases.length>150)throw Error('Enter at most 150 competing phases.');
  const constraints=[];
  function add(label,counts,enthalpy,kind,index){const A=(counts[x]||0)-(counts[z]||0)*a/c,B=(counts[y]||0)-(counts[z]||0)*b/c,C=enthalpy-(counts[z]||0)*h/c;constraints.push({label,counts,enthalpy,A,B,C,kind,index});}
  for(const e of elements)add(`${e} elemental limit`,{[e]:1},0,'element',-1);
  model.phases.forEach((p,index)=>{if(p.enabled===false)return;const counts=parseFormula(p.formula);if(Object.keys(counts).some(e=>!elements.includes(e)))throw Error(`${p.formula} contains an element outside ${elements.join('–')}.`);add(p.formula,counts,energyPerFormula(p,model.mode,model.refs||{},counts),'phase',index);});
  // Normalize rows to chemical-potential distance; constant constraints remain exact.
  const normalized=constraints.map(q=>{const n=Math.hypot(q.A,q.B);return n>1e-12?{A:q.A/n,B:q.B/n,C:q.C/n}:{A:0,B:0,C:q.C};});
  const scale=Math.max(1,Math.abs(h/a),Math.abs(h/b),Math.abs(h/c));const tolerance=1e-8*scale;
  const feasible=p=>normalized.every(q=>q.A*p[0]+q.B*p[1]-q.C<=tolerance);
  const points=[];
  for(let i=0;i<normalized.length;i++)for(let j=i+1;j<normalized.length;j++){
    const u=normalized[i],v=normalized[j],det=u.A*v.B-v.A*u.B;if(Math.abs(det)<1e-12)continue;
    const p=[(u.C*v.B-v.C*u.B)/det,(u.A*v.C-v.A*u.C)/det];
    if(p.every(Number.isFinite)&&feasible(p)&&!points.some(q=>Math.hypot(q[0]-p[0],q[1]-p[1])<tolerance*4))points.push(p);
  }
  points.sort((p,q)=>p[0]-q[0]||p[1]-q[1]);
  const cross=(o,p,q)=>(p[0]-o[0])*(q[1]-o[1])-(p[1]-o[1])*(q[0]-o[0]);
  function half(list){const r=[];for(const p of list){while(r.length>=2&&cross(r.at(-2),r.at(-1),p)<=tolerance*tolerance)r.pop();r.push(p);}return r;}
  let vertices=points;if(points.length>2){const lower=half(points),upper=half([...points].reverse());vertices=lower.slice(0,-1).concat(upper.slice(0,-1));}
  const area=vertices.length>2?Math.abs(vertices.reduce((sum,p,i)=>{const q=vertices[(i+1)%vertices.length];return sum+p[0]*q[1]-p[1]*q[0];},0))/2:0;
  const chemicalPotentials=p=>({...Object.fromEntries([[x,p[0]],[y,p[1]],[z,(h-a*p[0]-b*p[1])/c]])});
  const active=p=>constraints.filter((q,i)=>Math.abs(normalized[i].A*p[0]+normalized[i].B*p[1]-normalized[i].C)<=tolerance*5);
  return {elements,x,y,z,composition,h,constraints,vertices,area,tolerance,feasible,chemicalPotentials,active,dimension:vertices.length===0?-1:vertices.length===1?0:area<=tolerance*tolerance?1:2};
}
export const examples={
  SrTiO3:{mode:'formation',eliminated:'O',refs:{Sr:'',Ti:'',O:''},target:{formula:'SrTiO3',energy:-16,basis:'formula',units:1},phases:[['SrO',-6],['TiO2',-9],['Ti2O3',-14],['Sr2TiO4',-22],['SrO2',-7]].map(([formula,energy])=>({formula,energy,basis:'formula',units:1,enabled:true}))},
  Ba3V2O8:{mode:'formation',eliminated:'O',refs:{Ba:'',V:'',O:''},target:{formula:'Ba3V2O8',energy:-36,basis:'formula',units:1},phases:[['BaO',-5.5],['V2O5',-15],['VO2',-6],['BaV2O6',-23],['Ba2V2O7',-29]].map(([formula,energy])=>({formula,energy,basis:'formula',units:1,enabled:true}))}
};
