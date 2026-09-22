import {useEffect, useState} from 'react';
import {apiJson} from '../../services/apiClient';
import {creativeApi} from './creativeApi';
import type {Brand, CatalogItem, MediaRef} from './types';

const emptyItem = {kind: 'product' as const, name: '', description: '', benefits: '', price_text: '', cta_text: '', cta_url: ''};
export default function BrandCatalogPanel({onChanged}: {onChanged?: () => void}) {
  const [brands, setBrands] = useState<Brand[]>([]), [selected, setSelected] = useState('');
  const [name, setName] = useState(''), [tagline, setTagline] = useState(''), [phone, setPhone] = useState(''), [email, setEmail] = useState(''), [locations, setLocations] = useState(''), [website, setWebsite] = useState('');
  const [items, setItems] = useState<CatalogItem[]>([]), [editing, setEditing] = useState<CatalogItem | null>(null);
  const [form, setForm] = useState<{kind: 'product' | 'service'; name: string; description: string; benefits: string; price_text: string; cta_text: string; cta_url: string}>(emptyItem);
  const [media, setMedia] = useState<MediaRef[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const brand = brands.find(item => item.id === selected);
  useEffect(() => {let active = true; creativeApi.brands().then(result => {if(active) setBrands(result.brand_kits);}).catch(e => setError(String(e.message))); return () => {active = false;};}, []);
  function chooseBrand(id: string) {
    const next = brands.find(item => item.id === id); setSelected(id); setName(next?.company_name || next?.name || ''); setTagline(next?.profile_json.tagline || ''); setPhone(next?.profile_json.phone || ''); setEmail(next?.profile_json.email || ''); setLocations(next?.profile_json.locations?.join('\n') || ''); setWebsite(next?.website || ''); setEditing(null); setForm(emptyItem); setMedia([]);
    if(id) creativeApi.catalog(id).then(result => setItems(result.items)).catch(e => setError(e.message)); else setItems([]);
  }
  async function run(action: () => Promise<void>) {setBusy(true); setError(''); setNotice(''); try {await action(); onChanged?.();} catch(e) {setError(e instanceof Error ? e.message : 'Unable to save.');} finally {setBusy(false);}}
  async function saveBrand() {await run(async () => {
    const profile = {...brand?.profile_json, tagline, phone, email, locations: locations.split('\n').filter(Boolean)};
    const result = await apiJson<Brand>(selected ? `/api/brand-kits/${selected}` : '/api/brand-kits', {method: selected ? 'PATCH' : 'POST', body: JSON.stringify({name, company_name: name, website, profile_json: profile, ...(brand ? {expected_revision: brand.revision} : {})})});
    setBrands(current => [result, ...current.filter(item => item.id !== result.id)]); setSelected(result.id); setNotice('Brand profile saved. Existing posters keep their saved branding.');
  });}
  async function uploadLogo(file?: File) {if(!file || !brand) return; await run(async () => {
    const uploaded = await creativeApi.upload(file, 'logo'); const fileData = await creativeApi.dataUrl(uploaded);
    await apiJson(`/api/brand-kits/${brand.id}/logos`, {method:'POST', body:JSON.stringify({name:file.name, file_data:fileData, file_type:uploaded.mime_type, role:'primary', width:uploaded.width, height:uploaded.height})});
    setBrands((await creativeApi.brands()).brand_kits); setNotice('Exact logo saved to your brand kit.');
  });}
  async function saveItem() {if(!brand) return; await run(async () => {
    const endpoint = `/api/brand-kits/${brand.id}/catalog`;
    await apiJson(editing ? `${endpoint}/${editing.id}` : endpoint, {method: editing ? 'PUT' : 'POST', body: JSON.stringify({...form, benefits: form.benefits.split('\n').filter(Boolean), media, ...(editing ? {expected_revision: editing.revision} : {})})});
    setItems((await creativeApi.catalog(brand.id)).items); setEditing(null); setForm(emptyItem); setMedia([]); setNotice('Catalog item saved.');
  });}
  return <div className="grid">
    <section className="card"><h2>Brand profile</h2><p className="muted">Save the exact details to reuse in your posters and videos.</p><label>Brand<select value={selected} onChange={event => chooseBrand(event.target.value)} disabled={busy}><option value="">Create a brand</option>{brands.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <fieldset disabled={busy} style={{border:0,padding:0}}><label>Company or brand name<input value={name} onChange={e => setName(e.target.value)} maxLength={100}/></label><label>Tagline<input value={tagline} onChange={e => setTagline(e.target.value)} maxLength={250}/></label><div className="inline"><label>Phone<input value={phone} onChange={e => setPhone(e.target.value)} maxLength={80}/></label><label>Email<input value={email} onChange={e => setEmail(e.target.value)} maxLength={254}/></label></div><label>Website<input value={website} onChange={e => setWebsite(e.target.value)} maxLength={255}/></label><label>Locations · one per line<textarea value={locations} onChange={e => setLocations(e.target.value)}/></label><button className="primary" onClick={() => void saveBrand()} disabled={!name.trim()}>Save brand</button>
      {brand && <><label style={{marginTop:24}}>Upload exact logo<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => void uploadLogo(e.target.files?.[0])}/></label>{brand.logos[0] && <img src={brand.logos[0].file_data} alt={brand.logos[0].name} style={{width:120,height:90,objectFit:'contain'}}/>}<p className="compact muted">Manage colors and fonts in the existing Brand Hub.</p></>}</fieldset>
    </section>
    <section className="card"><h2>Products and services</h2>{!brand ? <p>Select or save a brand first.</p> : <><div className="catalog-list">{items.map(item => <button key={item.id} onClick={() => {setEditing(item); setForm({kind:item.kind,name:item.name,description:item.description || '',benefits:item.benefits.join('\n'),price_text:item.price_text || '',cta_text:item.cta_text || '',cta_url:item.cta_url || ''}); setMedia(item.media);}}><strong>{item.name}</strong> <span className="muted">· {item.kind}</span></button>)}</div><h3 style={{marginTop:25}}>{editing ? 'Edit catalog item' : 'Add catalog item'}</h3><fieldset disabled={busy} style={{border:0,padding:0}}><label>Type<select value={form.kind} onChange={e => setForm({...form,kind:e.target.value as 'product' | 'service'})}><option value="product">Product</option><option value="service">Service</option></select></label>{(['name','description','benefits','price_text','cta_text','cta_url'] as const).map(key => <label key={key}>{({name:'Name',description:'Description',benefits:'Benefits · one per line',price_text:'Price or offer text',cta_text:'Call to action',cta_url:'Call-to-action link'})[key]}{key==='description' || key==='benefits' ? <textarea value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}/> : <input value={form[key]} onChange={e => setForm({...form,[key]:e.target.value})}/>}</label>)}<label>Add product or service image<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => {const file=e.target.files?.[0]; if(file) void run(async () => {const result=await creativeApi.upload(file,'hero'); setMedia(current => [...current,{source:result.source,asset_id:result.id,role:current.length ? 'gallery' : 'hero',sort_order:current.length}]);});}}/></label><p className="compact">{media.length} image(s) attached</p>{media.map((entry,i) => <button key={entry.asset_id} onClick={() => setMedia(media.filter((_,j) => j!==i))}>Remove image {i+1}</button>)}<div className="actions"><button className="primary" disabled={!form.name.trim()} onClick={() => void saveItem()}>Save item</button>{editing && <><button onClick={() => {setEditing(null);setForm(emptyItem);setMedia([]);}}>New item</button><button onClick={() => void run(async () => {await apiJson(`/api/brand-kits/${brand.id}/catalog/${editing.id}?expected_revision=${editing.revision}`,{method:'DELETE'});setItems((await creativeApi.catalog(brand.id)).items);setEditing(null);setForm(emptyItem);setMedia([]);setNotice('Item archived. Existing designs keep their saved content.');})}>Archive</button></>}</div></fieldset></>}
    </section>{error && <p className="error" role="alert">{error}</p>}{notice && <p className="notice" role="status">{notice}</p>}
  </div>;
}
