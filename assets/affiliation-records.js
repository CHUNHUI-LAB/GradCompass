export const organization={
 'hnu':{kind:'school',label:'湖南大学'},
 'tongji':{kind:'school',label:'同济大学'},
 'whu':{kind:'school',label:'武汉大学'},
 'xmu':{kind:'school',label:'厦门大学'},
 'hnu-me':{kind:'college',school:'hnu',label:'机械与运载工程学院'},
 'tongji-survey':{kind:'college',school:'tongji',label:'测绘与地理信息学院'},
 'xmu-informatics':{kind:'college',school:'xmu',label:'信息学院'},
 'hnu-hive':{kind:'team',school:'hnu',label:'智能车辆课题组（HIVE）'},
 'whu-resnav':{kind:'team',school:'whu',label:'砺行（ResNav）团队'},
 'xmu-asc':{kind:'team',school:'xmu',label:'空间感知与计算团队（ASC）'}
};

const hive=['HIVE 团队名单','https://hive-lab.hnu.edu.cn/info/1003/1408.htm'];
const asc=['厦大 2027 团队名册','https://iai.xmu.edu.cn/team/PI/PI2027/jcll/kjgzyjs.htm'];
export const people=[
 {id:'hnu-hu-manjiang',name:'胡满江',school:'hnu',college:'hnu-me',team:'hnu-hive',role:'博士生导师',
  focus:'智能网联车辆、融合感知及 LiDAR–GNSS/IMU 标定。',
  other:[['其他证据','国家卓越工程师学院列为校内博导；不是主聘学院。'],['科研合作','与谢国涛同列 HIVE 名册，也同著标定论文；不推断共同指导。']],
  appointment:'2020 年已见教授任职；不标近五年。',admissions:'2023 年 080200 机械工程拟录取名单有全日制非定向申请考核历史记录；另列硕博连读。未确认 2028 秋季招募、方式或名额。',
  sources:[['学院师资','https://mve.hnu.edu.cn/hdjxyyzgcxy/szdw/jslb.htm'],hive,['校内博导名单','https://ngcee.hnu.edu.cn/szdw/dsdw/xnbssds.htm'],['2020 任职证据','https://hive-lab.hnu.edu.cn/info/1109/1368.htm'],['2023 拟录取名单','https://xxgk.hnu.edu.cn/__local/9/11/14/99B3BBE86071C5A262061B72266_B01F7DA0_5B394.pdf#page=8'],['联合标定论文','https://hive-lab.hnu.edu.cn/info/1110/1961.htm']]},
 {id:'hnu-xie-guotao',name:'谢国涛',school:'hnu',college:'hnu-me',team:'hnu-hive',role:'团队对照 · 仅核到硕导',
  focus:'环境感知、认知与预测；LiDARDustX 通讯作者。',
  other:[['科研合作','与胡满江合著联合标定工作；共同指导未核。']],appointment:'2018 年 7 月起在湖大任职。',admissions:'只用于呈现经证据确认的组织关系，不列为已核博士导师或博士招生线索。',
  sources:[['校内团队个人档案','https://hive-lab.hnu.edu.cn/info/1015/1323.htm'],hive,['联合标定论文','https://hive-lab.hnu.edu.cn/info/1110/1961.htm']]},
 {id:'tongji-zhang-dedong',name:'张德栋',school:'tongji',college:'tongji-survey',team:null,role:'学院名册列博士生导师',
  focus:'退化环境的鲁棒 SLAM、多传感器融合及 LiDAR–相机标定。',
  other:[['历史任职','2023–2026 年滑铁卢大学博士后，不计作现任团队。']],appointment:'2026 年起任同济副教授，为已核履历中最早的非博后高校教研任职。',admissions:'2027 学院有申请考核办法；个人当届通道、2028 秋季招募及余位未确认。',
  sources:[['校方个人履历','https://celiang.tongji.edu.cn/info/1301/4822.htm'],['学院博士生导师名单','https://celiang.tongji.edu.cn/Staff/zsdsmd.htm'],['2027 学院办法','https://celiang.tongji.edu.cn/info/1205/4865.htm'],['LiDAR–相机标定论文','https://doi.org/10.1109/TIM.2023.3244816']]},
 {id:'whu-li-you',name:'李由',school:'whu',college:null,team:'whu-resnav',role:'博士生导师',
  focus:'复杂环境下的多模态感知、可信定位、空间认知与自主导航。',
  other:[['校内所在单位','测绘遥感信息工程全国重点实验室；不推断为某学院。'],['团队角色','创立砺行（ResNav）团队。']],appointment:'至少 2021 年秋已有武汉大学教学记录；不标近五年。',admissions:'个人主页列博士生导师；未确认有日期的个人通道、2028 秋季招募及余位。',
  sources:[['校方个人主页','https://jszy.whu.edu.cn/liyou1/zh_CN/'],['校内教学记录','https://jszy.whu.edu.cn/liyou1/en/skxx/1363296/list/index.htm'],['砺行团队','https://www.r-navigation.com/']]},
 {id:'xmu-shen-siqi',name:'沈思淇',school:'xmu',college:'xmu-informatics',team:'xmu-asc',role:'博士生导师',
  focus:'三维视觉、视觉定位、具身与多智能体感知。',
  other:[['院内系别','计算机系'],['双聘','厦门大学人工智能研究院'],['团队角色','官方名册列为成员和联系人。']],
  appointment:'任厦门大学信息学院长聘副教授；首次正式任职核验不作为本页筛选项。',admissions:'ASC 明确团队招收 2027 年 9 月学博、专博；不等于沈老师个人指标、2028 秋季招生或余位。',
  sources:[['校方个人主页','https://faculty.xmu.edu.cn/SSQ1/en/index.htm'],asc,['团队 2027 招生公告','https://asc.xmu.edu.cn/newsInfo?id=89']]},
 {id:'xmu-wangcheng',catalogId:'xmu-wangcheng',name:'王程',school:'xmu',college:'xmu-informatics',team:'xmu-asc',role:'已有导师档案 · 分组对照',
  focus:'三维视觉、激光点云处理及机器人感知。',
  other:[['字段区别','按教师页与团队名册记录任职学院；主目录既有院系字段未更改。']],appointment:'本页不复判既有入职记录。',admissions:'不改变现有招生状态；未确认 2028 秋季个人通道或余位。',
  sources:[['院系个人主页','https://informatics.xmu.edu.cn/info/1033/177371.htm'],asc]},
 {id:'xmu-wenchenglu',catalogId:'xmu-wenchenglu',name:'温程璐',school:'xmu',college:'xmu-informatics',team:'xmu-asc',role:'已有导师档案 · 分组对照',
  focus:'三维视觉、点云智能处理。',
  other:[['院内系别','人工智能系'],['字段区别','按教师页与团队名册记录任职学院；主目录既有院系字段未更改。']],appointment:'本页不复判既有入职记录。',admissions:'本页不改变现有招生状态。',
  sources:[['校方个人主页','https://faculty.xmu.edu.cn/WCL/zh_CN/index.htm'],asc]}
];

export function groupsFor(mode,school=''){
 if(!['school','college','team'].includes(mode))return [];
 const groups=new Map();
 for(const person of people){
  if(school&&person.school!==school)continue;
  const key=person[mode];
  // Unknowns remain individual results, not shared memberships.
  const bucket=key||'unknown:'+person.id;
  if(!groups.has(bucket)){
   const prefix=mode==='school'?'':organization[person.school].label+' · ';
   const label=key?prefix+organization[key].label:prefix+(mode==='college'?'主聘学院未确认':'团队未确认');
   groups.set(bucket,{key:bucket,label,unknown:!key,people:[]});
  }
  groups.get(bucket).people.push(person);
 }
 return [...groups.values()];
}
