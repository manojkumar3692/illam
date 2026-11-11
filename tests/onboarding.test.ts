import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFirstHome } from '../lib/onboarding';
import { projectSchema } from '../lib/validation';
const input = {name:'  Onboarding Test Home  ',location:'  Purva Raagam, Chennai  ',budget:'',target:'',stages:true};
test('first home has clean finances and valid editable stages',()=>{
 const home=buildFirstHome(input);
 assert.equal(home.name,'Onboarding Test Home');
 assert.equal(home.location,'Purva Raagam, Chennai');
 assert.equal(home.transactions.length,0);
 assert.equal(home.reserve,0);
 assert.equal(home.budget,0);
 assert.equal(home.stages.length,6);
 assert.equal(new Set(home.stages.map(s=>s.id)).size,6);
 assert.ok(home.stages.every(s=>s.progress===0 && s.remaining===0));
 assert.ok(projectSchema.safeParse(home).success);
});
test('optional plans do not create funding and stages can be skipped',()=>{
 const home=buildFirstHome({...input,budget:'4500000',target:'2027-12-15',stages:false});
 assert.equal(home.budget,4500000);
 assert.equal(home.transactions.length,0);
 assert.equal(home.stages.length,0);
 assert.ok(projectSchema.safeParse(home).success);
});
test('rejects blank details, invalid budgets and impossible dates',()=>{
 for(const patch of [{name:' '},{location:' '},{budget:'-1'},{budget:'NaN'},{budget:'Infinity'},{target:'2027-02-30'}]) assert.throws(()=>buildFirstHome({...input,...patch}));
});
