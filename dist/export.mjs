// Keep exports independent of page styling and remove only explanatory captions.
export function cleanPlotSVG(diagram){
  const svg=diagram.cloneNode(true);
  svg.querySelectorAll('[data-export-omit], [data-plot-label]').forEach(node=>{
    if(node.hasAttribute('data-export-omit')||node.style.display==='none')node.remove();
  });
  const [,,width,height]=svg.getAttribute('viewBox').split(/\s+/).map(Number);
  svg.setAttribute('width',width);svg.setAttribute('height',height);
  return {source:new XMLSerializer().serializeToString(svg),width,height};
}
function crc32(bytes){let crc=0xffffffff;for(const byte of bytes){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
// PNG resolution is pixels/metre. Canvas otherwise writes its default 96 dpi.
export function pngResolution(bytes,dpi=300){
  const data=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  if(data.length<33||!data.slice(0,8).every((b,i)=>b===[137,80,78,71,13,10,26,10][i]))throw Error('Invalid PNG image.');
  const chunk=new Uint8Array(21),view=new DataView(chunk.buffer);view.setUint32(0,9);
  chunk.set([112,72,89,115],4);view.setUint32(8,Math.round(dpi/0.0254));view.setUint32(12,Math.round(dpi/0.0254));chunk[16]=1;view.setUint32(17,crc32(chunk.subarray(4,17)));
  const parts=[data.subarray(0,8)];let inserted=false,ended=false;
  for(let at=8;at<data.length;){
    if(at+12>data.length)throw Error('Incomplete PNG image.');
    const size=new DataView(data.buffer,data.byteOffset+at,4).getUint32(0),end=at+12+size;
    if(end>data.length)throw Error('Incomplete PNG chunk.');
    const type=String.fromCharCode(...data.subarray(at+4,at+8));
    if(type!=='pHYs')parts.push(data.subarray(at,end));
    if(type==='IHDR'){parts.push(chunk);inserted=true;}
    at=end;if(type==='IEND'){ended=true;break;}
  }
  if(!inserted||!ended)throw Error('Incomplete PNG structure.');
  const output=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const part of parts){output.set(part,at);at+=part.length;}return output;
}
export async function plotPNG(diagram){
  const {source,width,height}=cleanPlotSVG(diagram);
  await document.fonts.ready;
  const url=URL.createObjectURL(new Blob([source],{type:'image/svg+xml;charset=utf-8'}));
  try{
    const image=new Image();image.src=url;await image.decode();
    const canvas=document.createElement('canvas');canvas.width=2400;canvas.height=Math.round(2400*height/width);
    const context=canvas.getContext('2d');if(!context)throw Error('Image export is unavailable in this browser.');
    context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('Could not create PNG image.')),'image/png'));
    return new Blob([pngResolution(await blob.arrayBuffer())],{type:'image/png'});
  }finally{URL.revokeObjectURL(url);}
}
