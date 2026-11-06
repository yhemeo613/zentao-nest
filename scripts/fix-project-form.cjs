// codemod：project-list.vue 补 programId Select（避免 shell 转义，AGENTS §3 教训）
const fs = require('fs');
const p = 'apps/web/src/views/project/project-list.vue';
let s = fs.readFileSync(p, 'utf8');

// ① form 增加 programId
if (!s.includes("programId: '0'")) {
  s = s.replace("end: '', multiple: 1 });", "end: '', multiple: 1, programId: '0' });");
}

// ② create 参数直接用 form.programId
s = s.replace(
  'programId: Number(programsQuery.data.value?.[0]?.id ?? 0) > 0 ? Number(form.value.programId ?? 0) : 0,',
  'programId: Number(form.value.programId),',
);

// ③ 表单加「所属项目集」Select（插在「多执行」块前）
if (!s.includes('所属项目集')) {
  const anchor = '        <div>\n          <label class="mb-1 block">多执行</label>';
  const insert =
    '        <div>\n          <label class="mb-1 block">所属项目集</label>\n          <Select v-model="form.programId" :options="programOptions" />\n        </div>\n' +
    anchor;
  s = s.replace(anchor, insert);
}

fs.writeFileSync(p, s);
console.log('ok:', s.includes('所属项目集') && s.includes("programId: '0'"));
