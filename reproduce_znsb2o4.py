"""Independent reconstruction of Fig. 1 from published formation enthalpies.
Requires numpy and matplotlib. Run from the chemical-potential-lab directory.
No source-paper imagery is used in the generated figures.
"""
from pathlib import Path
from itertools import combinations
import json, csv
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Poly3DCollection

ROOT=Path(__file__).resolve().parent
OUT=ROOT.parent/'output'/'figures'/'znsb2o4'
OUT.mkdir(parents=True,exist_ok=True)
WEB=ROOT/'dist'/'paper'
datasets=json.loads((WEB/'znsb2o4-hse-vertices.json').read_text())
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'svg.fonttype':'none','axes.unicode_minus':True})

def surfaces(H):
    # Coordinates: x=delta mu Sb, y=delta mu O, z=delta mu Zn.
    rows=[('ZnSb2O4',[2,4,1],H),('ZnO',[0,1,1],-3.35),
          ('Sb2O3',[2,3,0],-6.82),('Sb2O5',[2,5,0],-10.28),
          ('Sb-bulk',[1,0,0],0),('O2',[0,1,0],0),('Zn-bulk',[0,0,1],0)]
    bounds=[(-3,0),(-2.8,-1.2),(-3,-.6)]
    for j,(lo,hi) in enumerate(bounds):
        n=np.zeros(3);n[j]=1;rows.append(('frame',n.copy(),hi));rows.append(('frame',-n,-lo))
    A=np.array([r[1] for r in rows]);b=np.array([r[2] for r in rows])
    points=[]
    for ijk in combinations(range(len(rows)),3):
        M=A[list(ijk)]
        if abs(np.linalg.det(M))<1e-10:continue
        p=np.linalg.solve(M,b[list(ijk)])
        if np.all(A@p<=b+1e-8) and not any(np.linalg.norm(p-q)<1e-8 for q in points):points.append(p)
    points=np.array(points);faces=[]
    for i,(name,normal,_) in enumerate(rows[:5]):
        f=points[np.abs(points@A[i]-b[i])<1e-7]
        if len(f)<3:continue
        c=f.mean(axis=0);n=A[i]/np.linalg.norm(A[i]);u=f[0]-c;u/=np.linalg.norm(u);v=np.cross(n,u)
        f=f[np.argsort(np.arctan2((f-c)@v,(f-c)@u))]
        assert np.all(A@f.T<=b[:,None]+1e-7)
        faces.append((name,f))
    return faces

colors={'ZnSb2O4':'#e53ded','ZnO':'#b7cff2','Sb2O3':'#c2e6f7','Sb2O5':'#b0edf4','Sb-bulk':'#b7cff2'}
labels={'ZnSb2O4':r'ZnSb$_2$O$_4$','ZnO':'ZnO','Sb2O3':r'Sb$_2$O$_3$','Sb2O5':r'Sb$_2$O$_5$','Sb-bulk':'Sb metal'}

for data in datasets:
    H=data['H'];kind=data['kind'];vertices=data['vertices'];faces=surfaces(H)
    # Cross-check the host facet against the app's independent 2D half-plane solver.
    host=next(f for name,f in faces if name=='ZnSb2O4')
    expected=np.array([[v['Sb'],v['O'],v['Zn']] for v in vertices])
    assert len(host)==len(expected)==4
    assert all(any(np.linalg.norm(p-q)<1e-7 for q in expected) for p in host)
    fig=plt.figure(figsize=(13,7.5),facecolor='white')
    ax=fig.add_axes([.02,.20,.52,.65],projection='3d')
    collection=Poly3DCollection([f for _,f in faces],facecolors=[colors[n] for n,_ in faces],edgecolors='#34465a',linewidths=.6,alpha=1)
    ax.add_collection3d(collection)
    for name,f in faces:
        if name=='ZnSb2O4':continue
        p=f.mean(axis=0)
        ax.text(*p,labels[name],fontsize=12,ha='center',va='center',color='#122d3b',zorder=20,**({'zdir':'z'} if name=='Sb-bulk' else {}))
    for v in vertices[:2]:
        p=(v['Sb'],v['O'],v['Zn']);ax.scatter(*p,s=13,color='#251636',depthshade=False)
        ax.text(p[0]-.06,p[1]+.06,p[2]+.05,v['label'],color='#c3262f',fontsize=17,weight='bold',zorder=30)
    ax.set(xlim=(-3,0),ylim=(-1.2,-2.8),zlim=(-3,-.6))
    ax.set_xlabel(r'$\Delta\mu_{\mathrm{Sb}}$ (eV)',labelpad=9)
    ax.set_ylabel(r'$\Delta\mu_{\mathrm{O}}$ (eV)',labelpad=9)
    ax.set_zlabel(r'$\Delta\mu_{\mathrm{Zn}}$ (eV)',labelpad=8)
    ax.view_init(elev=24,azim=-58)
    ax.set_box_aspect((3,1.6,2.4));ax.tick_params(labelsize=8,pad=1)
    for axis in (ax.xaxis,ax.yaxis,ax.zaxis):axis.pane.fill=False;axis._axinfo['grid'].update(color='#ccd5dd',linewidth=.4)
    ax.set_title('3D boundary surfaces · pink = host equilibrium',fontsize=11,pad=8)

    ax2=fig.add_axes([.62,.30,.33,.48])
    P=expected[:,:2];closed=np.vstack([P,P[0]])
    ax2.fill(P[:,0],P[:,1],color='#e53ded',alpha=.25)
    ax2.plot(closed[:,0],closed[:,1],color='#b227b6',lw=1.8)
    for v in vertices:
        ax2.scatter(v['Sb'],v['O'],s=20,color='#821c89',zorder=4)
        offsets={'A':(-14,9),'B':(8,-12),'C':(8,4),'D':(-16,-15)}
        ax2.annotate(v['label'],(v['Sb'],v['O']),xytext=offsets[v['label']],textcoords='offset points',weight='bold',color='#ad253a' if v['label'] in 'AB' else '#534766')
    # Labels are placed along the original constraints, not digitized from Fig. 1.
    for i,(u,v) in enumerate(zip(P,np.roll(P,-1,axis=0))):
        mid=(u+v)/2
        name=['ZnO','Sb metal',r'Sb$_2$O$_3$',r'Sb$_2$O$_5$'][i]
        off=[(-20,-18),(23,0),(20,15),(-46,0)][i]
        ax2.annotate(name,mid,xytext=off,textcoords='offset points',fontsize=9,color='#406474',ha='center')
    ax2.set(xlim=(-1.34,.22),ylim=(-2.47,-1.44),xlabel=r'$\Delta\mu_{\mathrm{Sb}}$ (eV)',ylabel=r'$\Delta\mu_{\mathrm{O}}$ (eV)')
    ax2.grid(alpha=.25);ax2.set_axisbelow(True);ax2.set_title('2D projection · same four vertices',fontsize=11,pad=12)
    location='Table 1' if kind=='table1' else 'main-text alternative'
    fig.suptitle(r'ZnSb$_2$O$_4$: HSE reconstruction of Fig. 1',fontsize=19,y=.97,color='#183441')
    fig.text(.5,.915,f'Host ΔHf = {H:.2f} eV/formula ({location})  |  Competitors: Table 2, HSE α = 0.48',ha='center',fontsize=11,color='#4b606d')
    A,B=vertices[:2]
    fig.text(.075,.15,f"A · O-rich:  ΔμZn = {A['Zn']:.3f},  ΔμSb = {A['Sb']:.3f},  ΔμO = {A['O']:.3f} eV",fontsize=11,color='#7c205c')
    fig.text(.075,.108,f"B · O-poor:  ΔμZn = {B['Zn']:.3f},  ΔμSb = {B['Sb']:.3f},  ΔμO = {B['O']:.3f} eV",fontsize=11,color='#7c205c')
    fig.text(.075,.055,'ZnO: −3.35   |   Sb₂O₃: −6.82   |   Sb₂O₅: −10.28 eV/formula. Reference shifts Δμ are eV/atom.',fontsize=9,color='#4b606d')
    fig.text(.075,.025,'Calculated from rounded published energies; no digitization. Source: Charoenphon et al., PCCP 25, 19116–19125 (2023), DOI: 10.1039/D3CP01470C.',fontsize=8,color='#5b6d78')
    name=f'znsb2o4-hse-{kind}'
    fig.savefig(OUT/f'{name}.png',dpi=190)
    fig.savefig(OUT/f'{name}.svg')
    fig.savefig(WEB/f'{name}.svg')
    plt.close(fig)

with (OUT/'znsb2o4-hse-vertices.csv').open('w',newline='') as f:
    writer=csv.writer(f);writer.writerow(['host_source','host_eV_per_formula','point','delta_mu_Zn_eV','delta_mu_Sb_eV','delta_mu_O_eV','active_boundaries'])
    for data in datasets:
        for v in data['vertices']:writer.writerow([data['kind'],data['H'],v['label'],v['Zn'],v['Sb'],v['O'],'; '.join(v['active'])])
print('Reconstructed both host-energy variants; all 3D host-face vertices match the app solver.')
