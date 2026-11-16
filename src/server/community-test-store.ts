import type { CommunityStore, CommunityTx } from './community-service.ts';

// Deterministic store exercises WATCH conflicts and atomic writes without a Devvit runtime.
export class MemoryStore implements CommunityStore {
  values = new Map<string, string>();
  sets = new Map<string, Map<string, number>>();
  revisions = new Map<string, number>();
  fail = false;
  touch(k: string) { this.revisions.set(k, (this.revisions.get(k) ?? 0) + 1); }
  async get(k: string) { return this.values.get(k); }
  async set(k: string, value: string, options?: { nx?: boolean; expiration?: Date }) {
    if (this.fail) throw new Error('storage-unavailable');
    if (options?.nx && this.values.has(k)) return '';
    this.values.set(k, value); this.touch(k); return 'OK';
  }
  async zRange(k: string, start: number | string, stop: number | string, options: { by: 'rank' | 'score'; limit?: { offset: number; count: number } }) {
    let rows = [...(this.sets.get(k) ?? [])].map(([member, score]) => ({ member, score }))
      .sort((a,b) => a.score - b.score || a.member.localeCompare(b.member));
    if (options.by === 'rank') rows = rows.slice(Number(start), Number(stop) + 1);
    else rows = rows.filter(r => r.score >= Number(start) && r.score <= Number(stop));
    if (options.limit) rows = rows.slice(options.limit.offset, options.limit.offset + options.limit.count);
    return rows;
  }
  async zRank(k: string, member: string) { const rows = await this.zRange(k,0,Infinity,{by:'rank'}); const i = rows.findIndex(r=>r.member===member); return i<0?undefined:i; }
  async zCard(k: string) { return this.sets.get(k)?.size ?? 0; }
  async watch(...keys: string[]): Promise<CommunityTx> {
    const revisions = keys.map(k=>this.revisions.get(k));
    const writes: (()=>void)[] = [];
    const tx: CommunityTx = {
      multi: async()=>{}, unwatch: async()=>{}, discard: async()=>{},
      set: async(k,v)=>{ writes.push(()=>{this.values.set(k,v);this.touch(k);}); },
      zAdd: async(k,row)=>{writes.push(()=>{if(!this.sets.has(k))this.sets.set(k,new Map());this.sets.get(k)!.set(row.member,row.score);this.touch(k);});},
      zRem: async(k,members)=>{writes.push(()=>{for(const m of members)this.sets.get(k)?.delete(m);this.touch(k);});},
      expire: async()=>{},
      exec: async()=>{
        if(this.fail) throw new Error('storage-unavailable');
        if(keys.some((k,i)=>this.revisions.get(k)!==revisions[i])) return [];
        for(const write of writes)write(); return writes.map(()=>1);
      },
    }; return tx;
  }
}
