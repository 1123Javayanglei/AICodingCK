// 作文的辅助材料 —— 这部分靠人写, 生成器推不出来:
//   ESSAY_RUBRICS  评分要点关键词
//   ESSAY_MODELS   范文(练习模式可以展开对照)
// 两个都是按 [科目id][作文id] 索引; 没有条目的作文不会报错, 只是功能弱一点。
//
// 格式: ESSAY_RUBRICS[科目id][作文id] = { points: [ ... ], anchors: [ ... ] }
//   每个要点 = [ 侧面1, 侧面2, ... ]          (建议和提纲里的要点一一对应)
//   每个侧面 = ['关键词', '关键词', ...]      (命中任意一个就算这个侧面写到了)
// 要点得分 = 命中的侧面数 / 总侧面数。
//
//   anchors  = ['主题词', ...]  可选, 强烈建议写
//   要点里难免混进 nowadays / i think / should 这类通用词, 只看要点覆盖率的话,
//   一篇完全跑题的文章也能蹭到一半以上的内容分。anchors 是"写这个话题必然会用到"
//   的词, 一个都没命中的话内容分直接压到很低, 并提示跑题。
//
// 关键词写法:
//   - 一律小写; 匹配时按词首对齐, 所以写词干就行: convenien 能命中
//     convenient / convenience, advertis 能命中 advertise / advertising。
//   - 整句短语直接写: 'more and more'。
//   - 侧面别拆太细, 两三个一组最稳; 拆太细会逼学生堆关键词。

window.ESSAY_RUBRICS = {
  english: {

    /* ---------------- Media and Shopping ---------------- */
    w1: {
      anchors: ['media', 'shop', 'buy', 'purchas', 'consum', 'customer', 'goods', 'product',
        'seller', 'market', 'price', 'money', 'advertis', 'internet', 'online', 'website',
        'television', 'network', 'deliver', 'brand', 'e-commerce', 'trade'],
      points: [
        [ // (1) 媒体发达 / 通过媒体购物很普遍
          ['media', 'internet', 'online', 'advertis', 'television', 'website', 'network', 'smartphone', 'app', 'platform', 'e-commerce'],
          ['common', 'popular', 'widespread', 'increasingly', 'more and more', 'prevail', 'prevalent', 'universal', 'growing', 'nowadays', 'most people', 'part of life'],
        ],
        [ // (2) 方便 + 弊端
          ['convenien', 'save time', 'time-saving', 'time saving', 'easier', 'easy', 'cheaper', 'variety', 'choice', 'compare price', 'at home', 'without going out', 'comfortable', 'efficien'],
          ['problem', 'disadvantage', 'drawback', 'risk', 'fraud', 'fake', 'counterfeit', 'quality', 'mislead', 'impulse', 'overspend', 'addict', 'privacy', 'unreliable', 'dishonest', 'harm', 'negative', 'downside', 'trap', 'cheat', 'however', 'waste'],
        ],
        [ // (3) 我的看法
          ['in my opinion', 'in my view', 'i think', 'i believe', 'as far as i am concerned', 'personally', 'from my point of view', 'my view', 'i hold'],
          ['should', 'must', 'need to', 'government', 'regulat', 'law', 'consumer', 'ourselves', 'conclusion', 'to sum up', 'in short', 'in a word', 'all in all', 'therefore', 'it is important', 'it is necessary', 'balance', 'rational', 'wise'],
        ],
      ],
    },

    /* ---------------- Some Aged People Like to Live Alone ---------------- */
    w2: {
      anchors: ['old', 'elder', 'aged', 'senior', 'alone', 'lonely', 'loneliness',
        'retire', 'grandparent', 'live alone', 'by themselves', 'on their own',
        'empty nest', 'apart', 'nursing home', 'the young', 'young people'],
      points: [
        [ // (1) present situation
          ['nowadays', 'recently', 'today', 'in recent years', 'at present', 'currently', 'modern society', 'with the development', 'these days', 'in china', 'as society'],
          ['more and more', 'increasingly', 'growing', 'common', 'widespread', 'numerous', 'a large number', 'many', 'popular', 'tend to', 'becoming'],
        ],
        [ // (2) possible reasons
          ['reason', 'because', 'why', 'due to', 'owing to', 'cause', 'account for', 'explain', 'for one thing', 'the first'],
          ['freedom', 'free', 'independen', 'privacy', 'habit', 'accustom', 'used to', 'familiar', 'prefer', 'comfortable', 'quiet', 'peaceful', 'generation gap', 'conflict', 'children', 'busy', 'abroad', 'far away', 'apart', 'own way', 'own home', 'relax', 'unwilling', 'burden', 'trouble'],
        ],
        [ // (3) your comment
          ['in my opinion', 'in my view', 'i think', 'i believe', 'as far as i am concerned', 'personally', 'from my point of view', 'my view', 'in conclusion', 'to sum up'],
          ['respect', 'understand', 'care', 'visit', 'lonely', 'loneliness', 'company', 'community', 'society', 'government', 'support', 'should', 'help', 'nursing home', 'attention', 'communicat', 'accompany', 'consider'],
        ],
      ],
    },

  },
};

// 范文: ESSAY_MODELS[科目id][作文id] = { paras: [第一段, 第二段, ...] }
// 写给谁看的很明确 —— 初中水平、不用难词、要能背下来。所以刻意:
//   - 句子短, 一段一个意思, 提纲几个要点就写几段
//   - 反复用同一个句型(We can... / We should...), 背起来有节奏
//   - 不出现 convenient 以外的"大词", 不用从句套从句
// 词数由 app.js 现场数, 不用写在这里, 免得改了正文忘了改数字。
window.ESSAY_MODELS = {
  english: {

    /* ---------------- Media and Shopping ---------------- */
    w1: {
      paras: [
        'The media is very developed today. We can see ads on TV, on the Internet and on our phones. ' +
        'More and more people buy things through the media. It has become a part of our daily life.',

        'Media shopping is very convenient. We can buy things at home and we do not need to go out. ' +
        'We can also compare the prices and choose what we like. But it has problems, too. ' +
        'We can only see pictures, so we may get the wrong things. Some people also spend too much money.',

        'Media shopping is good, but we should be careful. I think we should buy what we really need. ' +
        'If we use it in a right way, it will make our life better.',
      ],
    },

    /* ---------------- Some Aged People Like to Live Alone ---------------- */
    w2: {
      paras: [
        'More and more old people in China live alone today. They do not live with their children. ' +
        'We can see this in many cities and villages. It has become a common thing around us.',

        'Why do they live alone? First, they want to be free. They have their own habits and they do not ' +
        'want to change. Second, their children are very busy. Some of them work in other cities and come ' +
        'home only once a year.',

        'I think we should respect their choice. But we should also care about them. We should let ' +
        'them know we love them. We can call them or visit them often. The government can also help. ' +
        'If we do these things, they will not feel lonely.',
      ],
    },

  },
};
