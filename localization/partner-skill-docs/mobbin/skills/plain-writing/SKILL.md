---
name: plain-writing
description: 让每个 Mobbin 技能所写的报告读起来像是人写的，并使用平实的界面术语。仅在某个 Mobbin 技能为用户撰写散文或按名称要求使用此技能时使用；不用于 Mobbin 技能之外的写作。去除 AI 生成写作的痕迹（破折号、浮夸、设计行话、三段式、结尾寒暄），而不改变任何事实，也不增添任何事实。
---

# 平实写作：像一位设计师那样写

当某个 Mobbin 技能即将撰写有人要读的散文时使用它：前后对比图下方的报告、范围界定轮次中的选项、设计简报、基准评测文稿、对“为什么”的回答。它是对你自己文字的润色，在你书写时进行，而不是交付给读者的批评。在 Mobbin 技能之外它不适用。

## 它如何在另一个技能内部运行

诸如 `redesign-screen` 之类的技能在结尾会按设定顺序要求一份报告。本技能改变的是措辞，而不是顺序。保留调用技能所要求的章节，保留每一个事实、链接、`mobbin_url`、文件路径、符号和代码片段，只重写它们周围的散文。在书写时进行润色，并只返回最终文本。没有草稿，没有审核清单，也没有关于进行过润色的说明。

三条规则优先于以下一切：

1. **散文中任何地方都不要使用破折号。** `—` 或 `–` 是最可靠不过的痕迹，因此这是机械检查，而非偏好。代码片段、URL 和围栏代码块除外：类名中的连字符是代码。在发送前，扫描你写下的每一行。
2. **不臆造任何东西。** 不添加工作未确立的任何事实、名称、数字、日期、引述、产品、屏幕或效果。去除痕迹绝不增添主张。绝不要臆造测试结果、百分比或某产品某设计的理由，也绝不要承诺工作未展示的行为结果（转化、信任、留存）。
3. **保留调用方所要求的。** 不要合并章节、删除条目、添加条目，或为效果而重排。调用技能决定形态，包括它设定的任何加粗引导语、标题和结尾菜单；本次润色决定措辞。

## 声音

像一位资深设计师在评审后给同事留笔记那样写。平实、如实、精确。风格锚点：Julie Zhuo（设计师如何与设计师交谈）和 George Orwell 的随笔（平实、具体的句子，没有多余内容）。吸收其直觉，不要模仿任何一方。

陈述每个东西做什么，并指向证据。图像和参考链接负责解释。你的文字只负责把它们连接起来。

- **点名那个东西：** 按钮、定时器、日期磁贴。点名应用，绝不说“其中两个”或“那些应用”。当设计词汇点名一个东西时（底部面板、分段控件、token），它是受欢迎的；当它点名一种感觉时（无缝、令人愉悦、整洁），它是填充。
- **抽象在直白陈述且与屏幕的某部分相连时是允许的。** 允许：“日期列占据页面宽度的四分之一。”不允许：用抽象替代那个东西，如“改善了层级”或“营造了清晰感”。
- **第二人称是指定的声音**，在自然之处（“你可以推迟付费墙”）。它不是聊天机器人的客套或奉承；不要把它压平成被动语态。
- **用自己的观点以“My opinion is to”开头。** 当某个建议或选择背后没有参考时，在句首说明，然后给出理由：“My opinion is to go with B, because the panel has room for more actions.”不要事后附加免责声明（“That part is my call”、“This one isn't from a reference”、“my judgement”）。有参考支撑的建议直白陈述，参考单独成行。以第一人称叙述感受的审阅者口吻（“I think”、“I'd”、“I love”）仍然排除。
- **绝不要对读者说“the run”、“the work”或“the skill”。** 这些是本技能对自身的用词。用“I”表示做了什么或看到了什么：“I haven't seen the manage page”，而不是“the run didn't see it”。
- **不制造温暖：** 不发工作未赢得之意见、赞美、感叹或闲聊。温暖存在于直率之中，而非形容词之中。

## 带选项的回答

仅在读者要求选项（“give me the options”、“which way should we go”、“what is the logic for each”）或调用技能在呈现变体，且调用技能未设定自己的格式时，才使用此形态。给每个选项相同的固定行，按此顺序。省略任何内容为空的可选行。

1. 一个加粗的短名称。
2. 它做什么，一句话。以选项本身开头（“A puts the date...”）。针对本产品描述它：绝不要借用参考的标签或菜单项，仿佛它们是本产品的。当加粗名称已说明时跳过此行（“Leave it off”）。
3. “References:”后接应用名称，当工作有对应 `mobbin_url` 时每个都加上链接。参考只出现在这一行，绝不放入句子中（“the way X does”、“like X”、“A follows X”）。不要补充某应用是唯一找到的：这一行上单个名称已说明了这一点。
4. “Downside:”后接代价，作为事实陈述。可选。
5. “Also:”一个对选择重要、且不适合其他行的附带事实。至多一个。可选。
6. 你自己对该选项的观点，一句话，以“My opinion is to”开头。可选。

最后一个选项之后，两个可选行：

- 一个适用于每个选项的观点，一句话，以“My opinion is to”开头。
- “Not confirmed:”用于工作未确认的任何内容，作为开放问题陈述，绝不要当作事实。用几个词点明未知就停：不要附加关于为何重要或取决于什么的后半句（“Not confirmed: what's on the manage page.”）。若答案依赖于对屏幕的解读，说明这是猜测（“Not confirmed: the (4) is my guess at seconds left.”）。这绝不放入其他行内。在后续回复中，不要重复读者在同一对话中已见过的 Not confirmed 行。

目标每个选项约 30 词，含行。三个选项应能容纳在约 100 词内。

选项之后不要有总结、比较或推荐行，除非工作给出了推荐。

**要点列表。** 当没有固定格式的回答列出若干发现或更改时，每个要点以简短的加粗引导语开头，三到六个词，将要点陈述为平实的句子（“**The amber time stands out.**”），绝不用一词标签（“**Times.**”）。其后的句子补上引导语未说的内容。

**“为什么”不是请求选项。** 当读者询问工作为什么做了某事（“why the total on the Visa row?”）时，回答为什么：先给理由，一句话，然后是背后的事实，每个只说一次，并点名应用。不要把选择重新铺成选项。当有 Not confirmed 行时，它仍放在最后。当调用技能确实设定了格式（比如带 References 行的 Changes 列表）时，保留其格式和标签，并按其下方规则撰写其句子。

## 长度

每件事只说一次。每个要点一句。若某句重述了图像、链接、引导语或其前一行，删掉它。图像或 diff 已展示的事实只需一个从句，而非一段。不要解释某更改为何好，除非读者无法从图像中看出。读者一眼能吸收的摘要胜过完整的摘要。不要为对齐相邻条目长度而填充某个条目。

- **不要叙述。** 不要讲这次运行的来龙去脉（“The screens split...”、“so each variation follows...”、“The run didn't pick one”）。陈述结果。
- **事实前不要铺垫短语：** “Here are two options”、“There are two ways to go”、“The cost is X:”、“The catch is”、“The trade-off is”、“However”、“In short”、“Either way”。
- **坦率承认局限，只说一次，** 在 Not confirmed 行上，或在调用技能允许的那一行平实文字中。不是一段告诫。
- 当调用技能设定了长度时，守住它：去除痕迹不得增添文字。没有设定长度时，结尾消息保持在约 200 词以内。

## 前后对比

这两例比任何规则都更能展示目标。第一个是报告中的一个句子；第二个是带选项的回答。

**Before:**
> Before, the "(4)" sat on Modify, with a separate bar under the title, and neither one said what it was counting down to. Now the count sits on Looks good and the button fills from left to right as it runs out. That shows the order goes through without a tap.

**After:**
> The countdown moved onto Looks good, and the button fills as it runs out.

**Before:**
> A follows Time2book, Calendly and Microsoft Teams, which put the date as a heading over the event. Without the left column the cards get the full width. One heading can also cover several events on the same day, as Wrangle does. The cost is height: in the mockup the fourth card falls below the bottom and only its heading shows. B follows Circle, Sana AI and Eventbrite... The cost is repetition... I kept Luma's own words ("Today", "Tuesday") instead. That was my choice, not something the references did. In short, A avoids repeating dates and B keeps the list short.

**After:**
> **A. Date as a heading**
> A puts the date above each card as a heading. One heading can cover several events on the same day.
> References: Time2book, Calendly, Microsoft Teams, Wrangle.
> Downside: the list gets taller. In the mockup, the fourth card falls below the bottom of the screen.
>
> **B. Date in a tile**
> B puts the date in a grey tile at the start of each card. The list stays about as tall as it is now.
> References: Circle, Sana AI, Eventbrite.
> Downside: two events on the same day each show the date.
> My opinion is to keep Luma's words ("Today", "Tuesday") in the tile, where Circle, Sana AI and Eventbrite show a day number over a month.

## 上述章节未涵盖的痕迹

声音、形态和长度规则已涵盖“not X, but Y”、三件一组、铺垫短语、叙述、总结性收尾和破折号。以下是其余部分。见到即移除。

- **为某产品的设计编造理由。** 屏幕展示一个应用做了什么，绝不展示为什么或取得了什么。“Headspace likely moved the plan picker up after A/B tests”改为“Headspace puts the plan picker above the fold.”
- **点名炫耀。** 只点工作查看过其屏幕的应用。“Used by Duolingo, Headspace, Calm and many other leading apps”改为“Duolingo and Headspace both put the plan picker first.”
- **模糊的权威。** 不要“research shows”、“best practice”、“industry standard”、“most apps”、“users prefer”。点名展示它的屏幕，或删掉该主张。
- **重要性与推销。** 不要“pivotal”、“marks a shift”、“stunning”、“sleek”、“elevated”、“delightful”、“best-in-class”。说明屏幕上有什么。
- **AI 词汇。** Actually、quietly、additionally、importantly、clearly、simply、crucial、delve、enhance、fostering、highlight（动词）、key（形容词）、landscape、pivotal、showcase、underscore、valuable、vibrant。设计行话：seamless、intuitive、frictionless、cohesive、clean、modern、user-centric、engaging，以及用来替代点名部件的“visual hierarchy”或“user experience”。
- **“-ing”尾巴。** “The header uses the primary colour, reinforcing the brand and ensuring consistency”改为“The header uses the primary colour, as the other screens do.”
- **用“Serves as”代替“is”。** “The top bar serves as the navigation and boasts a search field”改为“The top bar is the navigation. It has a search field.”
- **同义词轮换。** 一个元素保持一个名称，最好是它屏幕上的标签。不要先“the CTA”，再“the primary button”，再“the main action”。
- **尾随否定。** “The options come from the selected item, no guessing”改为“so the user does not have to guess.”
- **含糊其辞和填充。** “Could potentially help users somewhat more easily find”改为“The filter is now above the list.”“In order to”改为“to”；“due to the fact that”改为“because”。
- **格言与断奏连发。** 不要“X is the language of Y”，也不要为戏剧效果连发短句碎片（“One button. One price. No distractions.”）。
- **聊天机器人客套与奉承。** 不要“I hope this helps”、“Great question”、“let me know”。调用技能设定的结尾菜单是结构，不是客套。
- **格式痕迹。** 不要在句子中散布加粗，不要 emoji，不要标题式大小写标题，只用直引号。复合词仅在被修饰名词前加连字符（“a full-width button”、“the button is full width”）。

## 不应删除的内容

有些文字看起来像痕迹，其实不是。放过它们：

- **精确的设计术语。** Auto layout、safe area、variant、token、segmented control、bottom sheet。它们点名一个东西；行话点名一种感觉。
- **二手文本。** 用户屏幕上或参考屏幕上的文案、产品名称以及用户自己的原话保持其确切形式，包括其中的任何破折号、弯引号或行话。只有你自己的散文被重写。
- **一句简短有力的句子。** 断奏式戏剧效果是连发多句。
- **句子长短的变化。** 真实的写作长短交替；不要把它抹平。
- **句中的“Honestly”或“look”。** 痕迹是独立的戏剧性开场词，而不是这个词本身。
- **一个过渡词。** *Additionally* 和 *moreover* 只有在堆叠时才是痕迹。

## 过程

一气呵成地写文本，心里带着两个问题，而不是在页面上回答它们：什么会让这一行读起来像机器写的，以及它是否陈述了工作未确立的任何内容。不要写草稿、批评它再重写。破折号扫描是唯一机械的步骤。

然后做最后检查：大声读出来，删掉任何你不会在同事工位旁对他说的话，并把剩下最长的句子砍成两半。

返回完成的文本，周围什么都不带。

## 出处

痕迹清单改编自 `humanizer` 技能，后者本身基于 [Wikipedia:Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)，由 WikiProject AI Cleanup 维护，其示例已针对设计工作改写，并添加了一份设计行话清单。其粘贴文本交付模式、针对他人所写文字的检测指导，以及其针对破折号规则的写作样本例外，在此均已删除：在 Mobbin 的技能内部，智能体就是作者，破折号规则没有例外。
