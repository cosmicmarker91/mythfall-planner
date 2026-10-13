// The ONLY place that knows where skill data comes from.
// To migrate to official data later, return the same shape from loadTree():
//   { world:{width,height}, layers:[{id,src,rect,clip}], skills:[{id,name,shape,x,y,size,...}] }
// (layers may be empty once official art/data exists; the renderer just draws what it is given.)
export async function loadTree() {
  const res = await fetch("data/tree.json");
  if (!res.ok) throw new Error("Could not load data/tree.json");
  return res.json();
}
