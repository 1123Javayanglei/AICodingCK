// 题目解析与释义
// id 规则: 分节-原题号, 如 lx1-13 表示 练习一 第 13 题
// 可自由修改补充; 没有对应条目的题目不会显示解析面板。
//
// 这里用的是"扁平"格式, 只属于英语(英语最先做, 一直是这个写法)。
// 以后加别的科目, 请用分科目格式, 否则不同科目的同名 id 会互相串:
//   window.QUESTION_EXPLANATIONS.数据结构 = { 'lx1-13': { ... } };
window.QUESTION_EXPLANATIONS = {

  /* ==================== 练习一 ==================== */

  'lx1-13': {
    key: '条件状语从句',
    translation: '如果你想要我们新产品的样品, 可以联系我们的销售经理。',
    explain: '主句说的是"想要样品就联系销售经理", 前后是条件关系, 用 if 引导条件状语从句。' +
      'while 表"当…时/尽管", until 表"直到", although 表"尽管", 放进句子都讲不通。' +
      '注意从句用一般现在时 want, 主句用 might 只是委婉语气, 不是虚拟语气, 所以不用 were to 之类。',
    words: [['sample', '样品, 样本'], ['contact', '联系'], ['sales manager', '销售经理']]
  },

  'lx1-14': {
    key: '倒装 + 过去完成时',
    translation: '直到到了机场, 我才意识到护照不见了。',
    explain: 'not until 放在句首时, 主句要部分倒装, 把助动词提到主语前面, 所以排除 C、D 两个正常语序的选项。' +
      '"意识到"发生在"到达机场"之前, 是"过去的过去", 用过去完成时 had realized; 倒装后写成 had I realized。',
    words: [['realize', '意识到'], ['passport', '护照'], ['missing', '丢失的, 不见的']]
  },

  'lx1-15': {
    key: 'what 引导主语从句',
    translation: '作为一名销售人员, 约翰和客户交谈时缺少的是自信。',
    explain: '空处引导主语从句, 并且要在从句里充当 lacks 的宾语(约翰"缺少"的东西), ' +
      '既作成分又没先行词的, 用 what(= the thing that)。' +
      'that 引导主语从句时不能在从句里作成分; which 表示"哪一个", 需要给定范围; why 表原因。',
    words: [['lack', '缺少, 缺乏'], ['self-confidence', '自信'], ['client', '客户']]
  },

  'lx1-16': {
    key: '虚拟语气(与过去相反)',
    translation: '要是我当时知道他的邮箱地址, 昨天就给他发消息了。',
    explain: '主句是 would have sent, 说明是对过去情况的假设(事实上没发), 从句要用 had + 过去分词。' +
      '记住这个配对: 从句 had done, 主句 would/could/might have done。',
    words: [['email address', '邮箱地址'], ['would have sent', '本来会发(实际没发)']]
  },

  'lx1-17': {
    key: '固定搭配 contribute to',
    translation: '员工越满意, 他们就越能为公司的成功做出贡献。',
    explain: 'contribute to 是固定搭配, 意为"为…做出贡献, 有助于"。' +
      '这个 to 是介词, 后面接名词或动名词。on / about / with 都不能和 contribute 搭配。' +
      '另外整句是 the more... the more... 结构, 表"越…越…"。',
    words: [['contribute to', '为…做贡献, 有助于'], ['satisfied', '满意的'], ['employee', '员工']]
  },

  'lx1-18': {
    key: '时间状语从句 before',
    translation: '他当着顾客的面大声念出了我的信用卡号, 我还没来得及阻止他。',
    explain: '前后是两个先后发生的动作, before 表示"还没来得及…就…", before I could stop him 是固定说法。' +
      'while / as 强调两个动作同时进行, 这里显然有先后; since 表"自从"或"既然", 都不符。',
    words: [['out loud', '大声地'], ['credit card number', '信用卡号']]
  },

  /* ==================== 练习二 ==================== */

  'lx2-1': {
    key: '固定搭配 draw a conclusion',
    translation: '没有足够可靠的数据和证据, 就得不出一项合理的结论。这就是科学精神。',
    explain: 'draw a conclusion 是固定搭配, "得出结论", 这里用的是被动 no conclusion can be drawn。' +
      'draw 在这里是"得出"的意思, 只有 conclusions 能做它的宾语。' +
      'reason 理由、approval 批准、source 来源, 都不能被 draw。',
    words: [['justifiable', '有正当理由的, 合理的'], ['sufficient', '充足的'],
            ['evidence', '证据'], ['draw a conclusion', '得出结论']]
  },

  'lx2-2': {
    key: '动词辨析(语境)',
    translation: '一位联合国发言人昨天说, 将向该地区增派部队, 以增援那里的联合国维和人员。',
    explain: '派兵增援维和部队, 用 reinforce(增援, 加强)。' +
      'represent 代表、resolve 解决、regain 重新获得, 和"派更多军队"这个语境都对不上。',
    words: [['reinforce', '增援, 加强'], ['troops', '部队, 军队'],
            ['peacekeeper', '维和人员'], ['spokesman', '发言人']]
  },

  'lx2-3': {
    key: '动词辨析(语境)',
    translation: '由于没有进一步的证据, 警察不得不释放了那名被捕男子, 他高高兴兴地回家了。',
    explain: '后半句"高高兴兴地回家了"是关键提示——人没事走了, 所以是 release(释放)。' +
      'reveal 揭露、receive 收到、relax 放松, 都接不上"被捕男子回家"这个结果。',
    words: [['release', '释放, 放开'], ['proof', '证据'], ['under arrest', '被逮捕的']]
  },

  'lx2-4': {
    key: '动词辨析(近义)',
    translation: '我们的英语老师责任心很强。他仔细地评价每个学生在口语练习中的表现。',
    explain: '对学生的"表现"打分、给出评价, 用 evaluate(评价, 评估)。' +
      'estimate 是"估计"(估数量、成本、时间); judge 是"判断、评判", 侧重裁定是非对错; assume 是"假定、认为", 都不带评估打分的意味。',
    words: [['evaluate', '评价, 评估'], ['estimate', '估计, 估算'],
            ['oral practice', '口语练习'], ['keen sense of responsibility', '强烈的责任感']]
  },

  'lx2-5': {
    key: '固定搭配 lead to',
    translation: '正是准备不充分导致了他考试失利, 但他却说这次考试出题太差。',
    explain: 'lead to 意为"导致, 引起", 前后是因果关系。其他三项都不成立: ' +
      'expose...to 是"使暴露于"; attribute A to B 是"把 A 归因于 B", 方向正好相反(要说 attribute his failure to inadequate preparations); ' +
      'result 表示"导致"时搭配是 result in, 没有 result to 这种说法。' +
      '句首是强调句型 It was ... that ...。',
    words: [['inadequate', '不充分的, 不恰当的'], ['lead to', '导致, 引起'],
            ['attribute A to B', '把 A 归因于 B'], ['result in', '导致(注意不是 result to)']]
  },

  'lx2-9': {
    key: '动词辨析(近义)',
    translation: '约翰逊家的猫喜欢追老鼠, 就好像在和它们玩一样。',
    explain: 'chase 指具体的"追赶、追逐"动作, 日常口语里猫追老鼠、小孩互相追逐都用它。' +
      'pursue 也表示"追", 但更正式, 强调持续追踪或追求(追捕罪犯、追求目标、从事某项事业), 不适合描写猫玩耍式的追逐。' +
      'run 和 travel 都不能直接接 the mice 作宾语。句末 as if it were 是虚拟语气。',
    words: [['chase', '追逐, 追赶'], ['pursue', '追求, 追捕(较正式)'],
            ['as if it were', '仿佛(虚拟语气)']]
  },

  'lx2-10': {
    key: '动词辨析(语境)',
    translation: '我很忙。我抽不出三天时间离开工作。你最好另找个人跟你一起去。',
    explain: 'afford 表示"负担得起", 既可以指钱, 也可以指时间、精力, 常和 can / can\'t 连用, ' +
      'can\'t afford + 名词 表示"承担不起、抽不出"。' +
      'spend 的主语必须是人, 且结构是 spend time (in) doing / on sth; stand 是"忍受", 后面一般不接 away from work 这样的结构; offer 是"提供", 主语通常不是自己。',
    words: [['afford', '负担得起, 抽得出(时间/钱)'], ['stand', '忍受'],
            ['three days away from work', '离开工作三天']]
  },

  'lx2-11': {
    key: 'as 引导非限制性定语从句',
    translation: '正如新想法常常遇到的情形一样, 大量的前期活动和乐观的讨论并没有产生具体的方案。',
    explain: 'as is often the case with... 是固定表达, "正如…常见的情形那样"。' +
      '这里的 as 是关系代词, 引导非限制性定语从句, 指代后面整个主句, 可以放在句首。' +
      'that 和 it 不能引导这种非限制性定语从句; which 引导非限制性定语从句时不能位于句首, 而且这里也没有先行词。',
    words: [['as is often the case', '情况常常如此'], ['preliminary', '初步的, 前期的'],
            ['optimistic', '乐观的'], ['concrete proposal', '具体方案']]
  },

  'lx2-12': {
    key: '原因状语从句 now that',
    translation: '既然没人有更多要说的了, 我们就结束讨论吧。',
    explain: 'now that 引导原因状语从句, "既然", 常用来引出已知的、双方都清楚的原因, 和汉语的"既然"完全对应。' +
      'when / while 表时间; so that 表目的, "以便"。',
    words: [['now that', '既然'], ['round off', '圆满结束, 收尾']]
  },

  'lx2-13': {
    key: '让步状语从句 even though',
    translation: '我被说服去做那份工作, 尽管我并不想做。',
    explain: '主句说"去做了", 从句说"不想做", 前后是让步关系, 用 even though(尽管)。' +
      'lest 意为"以免, 免得", 后面跟 should + 动词原形, 表示目的; in order that 表目的; in case 表"以防万一"。',
    words: [['persuade', '说服'], ['even though', '尽管'],
            ['lest', '以免(后接 should do)'], ['in case', '以防万一']]
  },

  'lx2-14': {
    key: 'so...that 结果状语从句',
    translation: '他跑得那么快, 没人能追上他。',
    explain: 'so + 副词 + that 引导结果状语从句, "如此…以至于"。' +
      '这里 so fast 修饰动词 ran。very 不能和 that 搭配; that 单独也引不出结果从句。' +
      '注意区分: so + 形容词/副词 + that, 而 such + 名词 + that。',
    words: [['so...that...', '如此…以至于…'], ['catch', '抓住, 追上']]
  },

  'lx2-15': {
    key: '原因状语从句 seeing that',
    translation: '鉴于他不会接受这个提议, 我只好另找别人。',
    explain: 'seeing that 意为"鉴于, 考虑到, 既然", 引导原因状语从句, 正好解释"为什么只好另找人"。' +
      'though 表让步, 与后面"只好另找他人"的结果逻辑不通; until / as soon as 表时间。',
    words: [['seeing that', '鉴于, 既然'], ['offer', '提议, 报价, 出价']]
  },

  'lx2-16': {
    key: '目的状语从句 so that',
    translation: '你必须每天练习, 这样才能赢得比赛。',
    explain: 'so that 引导目的状语从句, "以便, 为了", 表示"每天练习"的目的。' +
      'unless(除非)表条件, when / while 表时间, 都不能表示目的。',
    words: [['so that', '以便, 为了'], ['practice daily', '每天练习'], ['race', '比赛, 赛跑']]
  },

  'lx2-17': {
    key: '时间状语从句 before',
    translation: '在做最终决定之前, 我们再把这一切讨论一遍吧。',
    explain: '按动作发生的先后, "讨论"在"做最终决定"之前, 所以用 before。' +
      'after 会把顺序弄反; while / as 强调同时进行, 而这里明显有先后。',
    words: [['talk over', '讨论, 商量'], ['final decision', '最终决定']]
  },

  'lx2-18': {
    key: 'whether...or... 让步',
    translation: '所有物质, 无论是气体、液体还是固体, 都随温度升高而膨胀。',
    explain: 'whether it is A, B or C 表示"不管是 A、B 还是 C", 在这里作让步状语, 插在主语和谓语之间。' +
      'no matter 不能单独引导(要说 no matter whether); even if 表"即使", 后面不接 or 并列的三种形态; whatever 后面要接名词性成分, 不能说 whatever it is a gas。',
    words: [['whether...or...', '不管是…还是…'], ['matter', '物质'],
            ['expand', '膨胀'], ['liquid', '液体']]
  },

  'lx2-19': {
    key: '目的状语从句 in order that',
    translation: '我们必须改进耕作方法, 以便获得高产。',
    explain: 'in order that 引导目的状语从句, "为了, 以便", 从句中常配 may / might / can / could。' +
      'therefore 是副词, 不能引导从句; as 表原因或时间; of 是介词。' +
      '同义表达还有 so that、in order to(后接动词原形)。',
    words: [['in order that', '为了, 以便'], ['farming method', '耕作方法'],
            ['yield', '产量, 收成']]
  },

  'lx2-20': {
    key: '原因状语从句 as',
    translation: '由于天气很好, 我把所有的窗户都打开了。',
    explain: 'as 引导原因状语从句, 意为"由于", 语气比 because 弱, 多用于众所周知或显而易见的原因, 且常放在句首。' +
      'Because of 是介词短语, 后面只能接名词或代词, 不能接"the weather was fine"这样完整的句子; ' +
      'for 引导的原因分句一般不放在句首, 多用来补充说明理由; with 是介词。',
    words: [['as', '由于, 因为'], ['because of', '因为(后接名词, 不接句子)'],
            ['fine', '晴朗的']]
  },

  /* ==================== 练习三 ==================== */

  'lx3-1': {
    key: '名词辨析',
    translation: '除了找工作难, 在房租这么高的地方找住处也会是个问题。',
    explain: '在房租高的地方要找的是"住处", 用 accommodation(住宿, 住处)。' +
      'insurance 保险、installation 安装、accumulation 积累, 都和"住"无关。' +
      'accommodation 英式英语中常用不可数形式。',
    words: [['accommodation', '住宿, 住处'], ['insurance', '保险'],
            ['installation', '安装'], ['rent', '租金']]
  },

  'lx3-2': {
    key: '名词辨析(近义)',
    translation: '这八台汽轮发电机的发电量将达到 60 亿千瓦时。',
    explain: '描述机器设备的"容量、产能"用 capacity。' +
      'quantity 只表示数量多少, 不含"产能"义; capability 和 ability 都指"能力", 多用于人或组织做某事的能力, 不能用来讲发电机的装机容量。',
    words: [['capacity', '容量, 产能'], ['quantity', '数量'],
            ['capability', '能力, 性能'], ['turbine generator', '汽轮发电机'],
            ['kilowatt hour', '千瓦时(度)']]
  },

  'lx3-3': {
    key: '动词辨析(物理动作)',
    translation: '众所周知, 热金属冷却时会收缩。',
    explain: '物体的"冷缩"用 contract, 它的反义词是 expand(膨胀), 热胀冷缩就是 expand and contract。' +
      'condense 指气体冷凝成液体; compress 指出于外力把东西压紧、压缩; retreat 是撤退, 都不符。',
    words: [['contract', '收缩(反义: expand 膨胀)'], ['condense', '冷凝, 凝结'],
            ['compress', '压缩'], ['retreat', '撤退']]
  },

  'lx3-4': {
    key: '固定搭配 protest against',
    translation: '这场战争持续得太久, 人们已经厌倦了。每天都有大批示威者抗议这场战争。',
    explain: 'protest against sth 是固定搭配, "抗议, 反对某事"。' +
      'protect 保护(搭配 protect...from...); prescribe 开处方、规定; prosecute 起诉、检控。' +
      '这四个词形近, 要靠搭配和语境区分。',
    words: [['protest against', '抗议, 反对'], ['demonstrator', '示威者'],
            ['protect...from...', '保护…免受…'], ['prosecute', '起诉, 检控']]
  },

  'lx3-5': {
    key: '形容词辨析',
    translation: '尽管他们每年都在这个地区种树, 但有些山的顶部仍然是光秃秃的。',
    explain: '山上没有植被覆盖, "光秃秃的"用 bare(裸露的, 光秃的)。' +
      'blank 指"空白的"(纸张、表格、表情); hollow 指"中空的"; ' +
      'vacant 指"空缺的、未被占用的"(职位、房间、座位)。',
    words: [['bare', '光秃的, 裸露的'], ['blank', '空白的'],
            ['hollow', '中空的'], ['vacant', '空闲的, 未被占用的']]
  },

  'lx3-9': {
    key: 'pick 短语辨析',
    translation: '你为什么总是刁难我去做这些讨厌的工作?',
    explain: 'pick on sb 意为"挑某人的刺, 找茬, 专门为难某人", 含贬义, 正好对应"总是让我干讨厌的活"。' +
      'pick off 摘下、逐个除掉; pick out 挑出、辨认出; pick up 捡起、接人、学会。',
    words: [['pick on', '刁难, 找茬'], ['pick out', '挑出, 辨认出'],
            ['pick up', '捡起, 接(人)'], ['unpleasant', '令人不快的']]
  },

  'lx3-10': {
    key: 'carry 短语辨析',
    translation: '他们说尽管条件极其困难, 他们还是下定决心要完成这项任务。',
    explain: 'carry out 意为"执行, 实施, 完成", carry out the task 是完成任务、把这活干下来。' +
      'carry off 是"成功应付、夺得(奖项)"; carry on 是"继续(进行)", 不强调完成; carry forward 是"结转、发扬"。' +
      '搭配 make up one\'s mind to do sth 表示"下定决心做某事"。',
    words: [['carry out', '执行, 完成'], ['carry on', '继续进行'],
            ['make up one\'s mind', '下定决心'], ['in spite of', '尽管']]
  },

  'lx3-11': {
    key: '限定词搭配',
    translation: '这个班几乎所有的学生都通过了考试。',
    explain: 'almost 是程度副词, 用来修饰 all, almost all of the students = 几乎所有学生。' +
      'most all of 不是正确的搭配; most of all 意为"最重要的是", 是副词短语, 不能修饰名词; ' +
      'the whole of 后面接不可数名词或把某物当作整体, 不能接 the students 这样的复数可数名词。',
    words: [['almost all of', '几乎全部'], ['most of all', '最重要的是'],
            ['whole', '整个的'], ['pass the examination', '通过考试']]
  },

  'lx3-12': {
    key: '代词 those 替代',
    translation: '今天的图书馆与过去的图书馆大不相同。',
    explain: '比较的对象要一致, 这里比较的是"图书馆"这一类, 前面是 Today\'s libraries(复数)。' +
      '英语中用 those 替代前面出现过的复数名词, 单数或不可数才用 that。' +
      '所以是 those of the past(= the libraries of the past)。that of the past 只能替代单数; those past 缺少 of。',
    words: [['differ from', '与…不同'], ['those of the past', '过去的那些(图书馆)'],
            ['that of', '替代单数名词(如 the population of)']]
  },

  'lx3-13': {
    key: '代词 one 的用法',
    translation: '很遗憾, 你所采取的这一举措风险很大。',
    explain: 'one 在这里是不定代词, 泛指同类中的一个, 指代"你采取的这一步(举措)", ' +
      '构成 be one of great risk, 相当于 is a step of great risk。' +
      'that 需特指前文提到过的那一个, 这里不合适; any / none 与 of great risk 搭配讲不通。' +
      '注意区分 one of + 复数名词(…之一)和这里 one of + 抽象名词(是…的一种)。',
    words: [['step', '举措, 步骤'], ['take a step', '采取行动, 采取措施'],
            ['of great risk', '风险很大的']]
  },

  'lx3-14': {
    key: '否定句中的 anything',
    translation: '艾伦卖掉了他的大部分家当。房子里几乎没剩下什么东西了。',
    explain: 'scarcely 是表示否定的副词, "几乎不", 形式上是否定句, 所以要用 anything。' +
      'everything 和 something 用于肯定句; nothing 本身就是否定词, ' +
      '再和 scarcely 连用就成了双重否定(反而表示"没什么不剩"), 意思会反。',
    words: [['scarcely', '几乎不'], ['belongings', '财物, 家当'],
            ['left', '剩下的(leave 的过去分词作后置定语)']]
  },

  'lx3-15': {
    key: '代词 none / neither 辨析',
    translation: '这些提供的选择我一个都没选, 因为我觉得它们没有一个令人满意。',
    explain: '前面的 any of the offerings 说明是三者以上, 所以排除 neither 和 either(这两个只能用于两者)。' +
      'none of them 意为"它们中没有一个", 正好符合。' +
      'no one 只能指人, 而且后面不能接 of them(要说 none of them)。',
    words: [['none of them', '它们中没有一个'], ['neither', '两者都不'],
            ['either', '两者中任一个'], ['satisfactory', '令人满意的']]
  },

  'lx3-16': {
    key: '代词与主谓一致',
    translation: '伊顿女校的每一位师生都为她的学校感到自豪。',
    explain: 'Eton Girls College 是女校, 所以用 her。' +
      '另外 every teacher and pupil 作主语时, 谓语用单数 is, 相应的代词也用单数, 不能用 their。' +
      'one\'s 表示泛指"某人的", 这里指的是特定这所学校的人, 不合适。',
    words: [['be proud of', '为…感到自豪'], ['pupil', '小学生, 学生'],
            ['college', '学院, 学校']]
  },

  'lx3-17': {
    key: 'healthy / healthful 辨析',
    translation: '每天吃一个苹果被认为有益健康。',
    explain: '这道题考的是传统的区分: healthful 表示"有益健康的", 说明某物对健康有好处, ' +
      '这里主语是 Eating an apple a day 这件事, 是它对人的健康有好处, 所以用 healthful。' +
      'healthy 指"健康的", 描述人或者事物本身处于健康状态。' +
      'healthily 是副词, 不能作主语补足语; health 是名词。' +
      '(说明: 现代英语口语中 an apple is healthy 也很常见, 但考这道原题时按上面的规则选 healthful。)',
    words: [['healthful', '有益健康的'], ['healthy', '健康的'],
            ['be considered', '被认为'], ['主语补足语', '说明主语的成分, 跟在 be considered 后']]
  },

  'lx3-18': {
    key: 'respect 派生词辨析',
    translation: '这个城市的市长是一位令人尊敬的老人。',
    explain: 'respectable 意为"值得尊敬的, 体面的", 形容人可敬, 符合语境。' +
      'respectful 是"恭敬的, 有礼貌的", 指对别人表示尊敬, 常用 be respectful to sb; ' +
      'respective 是"各自的, 分别的"; respecting 是介词, "关于"。' +
      '记住这组: respectable 受人尊敬, respectful 尊敬别人, respective 各自的。',
    words: [['respectable', '值得尊敬的, 体面的'], ['respectful', '恭敬的, 有礼的'],
            ['respective', '各自的, 分别的'], ['mayor', '市长']]
  },

  'lx3-19': {
    key: '固定搭配 fall asleep',
    translation: '他刚上床就睡着了。',
    explain: 'fall asleep 是固定搭配, "入睡, 睡着", 这里的 fall 是系动词, 后面接形容词 asleep。' +
      'sleepy 是"困倦的、想睡的", 指还没睡着; slept 是动词过去式, 不能跟在 fall 后面; ' +
      'sleeping 也不能用在 fall 之后。' +
      '另外 no sooner...than... 表示"一…就…", 主句用过去完成时并倒装(had he gone), than 从句用一般过去时。',
    words: [['fall asleep', '入睡, 睡着'], ['sleepy', '困倦的, 想睡的'],
            ['no sooner...than...', '一…就…(主句倒装)']]
  },

  'lx3-20': {
    key: '程度副词修饰形容词',
    translation: '我今晚来不了。这根本不可能。',
    explain: 'quite 可以修饰 impossible、perfect、unique 这类"没有程度差别"的绝对形容词, 表示"完全, 彻底"。' +
      'fairly 表示"相当", 程度较轻, 多修饰褒义形容词; very 一般不加这类绝对形容词; ' +
      'rather 表示"相当", 多修饰贬义或含比较意味的词。' +
      '所以 quite impossible = 完全不可能。',
    words: [['quite', '完全, 彻底; 相当'], ['fairly', '相当(程度较轻)'],
            ['rather', '相当(多修饰贬义)'], ['impossible', '不可能的']]
  }

};
