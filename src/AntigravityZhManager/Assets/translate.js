(() => {
  const patchVersion = 69;
  const skillDetails = window.__antigravityZhSkillDetails || { documents: [], translations: {} };
  const detailDocuments = [...skillDetails.documents, ...(skillDetails.additionalDocuments || []), ...(skillDetails.builtinDocuments || [])];
  const reviewedReadmeBlocks = new Map((skillDetails.readmeBlocks || []).map(b => [b.source, b]));
  const dictionary = window.__antigravityZhPatchDictionary || {};
  const identity = window.__antigravityZhPatchDictionarySignature || JSON.stringify(dictionary);
  const guard = `${patchVersion}:${identity}:${skillDetails.revision || ''}`;
  if (window.__antigravityZhPatchGuard === guard && window.__antigravityZhPatchInstalled &&
      window.__antigravityZhPatchController && !window.__antigravityZhPatchController.stopped) return;

  window.__antigravityZhPatchController?.stop();
  window.__antigravityZhPatchObserver?.disconnect();
  window.__antigravityZhPatchInstalled = false;
  window.__antigravityZhPatchGuard = null;
  const translations = new Map([...Object.entries(dictionary), ...detailDocuments.flatMap(d => Object.entries(d.overrides || {}))]);
  const mwgMap = {"accessible-error-announcement":"将程序化无障碍状态（如 aria-invalid）与视觉上的 :user-invalid 状态同步，使屏幕阅读器用户也仅在交互后收到错误反馈，与视觉体验保持一致。","accessible-generated-content":"以保持无障碍访问的方式使用 CSS 生成内容（::before/::after），包括为装饰性内容提供替代文本。","respect-os-text-scale":"遵循操作系统的文字缩放偏好，使页面字号、布局和基于 rem 的尺寸随用户的无障碍设置调整。","language-detection":"检测用户生成内容或网站已有内容的语言。","language-model":"使用 Prompt API 在浏览器中进行端侧自然语言推理，支持流式输出、结构化 JSON 响应和多轮会话管理。","summarizer":"使用端侧 Summarizer API 对文本内容生成摘要。","translator":"使用端侧 Translator API 在不同语言之间翻译文本。","animate-to-intrinsic-sizes":"使手风琴、菜单和展开卡片等交互组件平滑过渡到自然尺寸，也能从自然尺寸平滑收起。","atrule-support-conditionals":"仅当浏览器支持某个 @ 规则时，才有条件地应用特定 CSS 规则或声明。","calculate-with-intrinsic-sizes":"根据元素的内在尺寸计算大小，同时确保满足既定设计约束。","child-state-based-styling":"构建根据子元素状态改变样式的组件。例如，根据主题开关是否选中来切换组件的明暗模式。","content-based-styling":"构建根据是否包含特定子元素来改变布局的组件。例如，包含图片时采用多列布局，否则采用单列布局。","css":"面向实际操作的现代 CSS 架构指南，涵盖层叠、选择器、作用域、嵌套和设计令牌。在编写样式或管理设计系统时使用。","css-layout":"现代 CSS 布局指南，涵盖 flexbox、grid、subgrid、容器查询、锚点定位和内在尺寸。在设计响应式 UI 组件或页面布局时使用。","design-token-reactivity":"定义密度模式（紧凑、舒适、宽松）或主题等高阶设计令牌，让后代组件以适合自身的方式直接响应变化。","dynamic-sibling-styling":"创建可根据组内元素数量自动调整的动态视觉渐变序列或布局排列。","fluid-scaling":"根据父容器尺寸平滑调整字号、间距和媒体大小等，而非使用固定断点。","individual-transform-properties":"在同一元素上独立动画化或覆盖 translate、rotate、scale 等 CSS 变换属性，不影响其他变换属性。","overflow-clipping-control":"将元素的可见裁剪边界调整到内容边缘、内边距边缘或边框边缘，也可相对这些边缘指定偏移量，更精细地控制内容裁剪。","reduce-style-repetition":"将复杂或动态样式逻辑封装为可复用函数，减少重复样式，例如根据一组输入参数计算渐变的函数。","responsive-design":"构建适应容器和视口尺寸的界面，涵盖容器查询、动态视口单位、宽高比和响应式排版。","selector-atrule-combinations":"根据选择器与条件 @ 规则的交集或并集选取元素，同时减少重复代码。","size-aware-styling":"构建样式取决于组件自身宽高、而非视口宽高的组件。例如，卡片根据自身大小改变布局，操作按钮根据自身宽度决定是否显示辅助文字。","style-parent-with-has":"在表单字段无效时，为其父元素（如标签或字段集）设置样式。","usage-aware-component-variations":"使用 CSS 容器样式查询，构建根据语义上下文调整视觉逻辑的组件。","animated-select-picker":"创建下拉部分带动画的自定义选择组件，例如菜单淡入或滑入，或选项在选中时播放动画。","autofill-address-form":"构建具有正确 autocomplete 属性并支持自动填充的地址表单。","autofill-highlight-inputs":"使用 CSS 高亮被浏览器自动填充、且尚未经用户编辑的表单字段。","autofill-payment-form":"构建收集银行卡信息的支付表单，使用正确的 autocomplete 值并支持自动填充。","autofill-sign-in-form":"构建使用正确 autocomplete 值并支持自动填充的登录表单。","autofill-sign-up-form":"构建使用正确 autocomplete 值并支持自动填充的注册表单。","brand-consistent-forms":"让复选框、单选按钮、范围滑块和进度条匹配网站配色，无需将其替换为自定义组件。","branded-select-styling":"创建自定义选择元素，使其按钮、选择面板、箭头图标和勾选标记的字体、颜色、间距与边框均匹配品牌或设计系统。","custom-select-picker-layouts":"创建选项采用独特布局的自定义选择面板，突破传统纵向选项列表的限制。","form-fields-automatically-fit-contents":"让表单字段随用户输入或选择不同选项自动伸缩，并通过最大和最小尺寸限制，使动态响应式字段符合页面设计。","ime-safe-enter-submit":"为输入法（IME）用户安全实现键盘提交（如聊天框或文本区按回车提交），防止尚未输入完整的文本被提前提交。","required-field-feedback":"仅在用户交互后，才为被跳过或留空的必填字段显示错误信息，避免过早报错，并确保反馈及时且符合用户操作流程。","rich-media-picker":"创建选项可包含图片、图标及其他复杂 HTML 格式的自定义选择组件，而不限于纯文本。","select-menu-interaction":"仅在用户与选择菜单交互后，才验证是否已选择非默认选项。","slider":"为原生范围滑块自定义轨道、滑块、填充和焦点状态，同时保留原生功能和无障碍支持。","sms-otp-form":"通过自动提取短信验证码和无障碍表单输入，验证用户手机号及短信发送的一次性验证码。","switch":"使用原生 HTML switch 属性构建无障碍开关；不受支持时回退为带样式的复选框。","validate-input-after-interaction":"仅在用户完成首次交互后，才显示密码复杂度、邮箱格式等字段验证反馈，避免页面加载时或用户输入过程中提前报错。","accessible-web-components":"通过 ElementInternals 的 ARIA mixin 设置角色和 ARIA 状态，使用 delegatesFocus 管理焦点，并将 ARIA 关系保持在同一影子根中，让自定义元素默认具备无障碍支持。","custom-elements":"定义、注册并管理自主自定义元素的生命周期，涵盖构造函数规则、生命周期回调、升级时机、特性与属性的映射及命名约定。","form-associated-custom-elements":"使用 formAssociated 和 ElementInternals 让自定义控件原生参与表单，提交自身值、接入约束验证，并响应重置、禁用和状态恢复。","prerendering-custom-elements":"在服务器端渲染自定义元素，再原地完成水合，无需重新渲染，也不会闪现无样式内容。","shadow-dom":"使用 Shadow DOM 封装组件的 DOM 与样式，借助 HTML 模板高效构建节点树，并通过插槽投射使用方提供的内容。","styling-web-components":"通过 :host 选择器、用于主题的继承属性与自定义属性、::slotted 和 ::part 跨影子边界设置样式，并在组件内使用层叠层和容器查询。","web-components":"介绍编写和使用 Web Components 的整体原则，涵盖自定义元素、Shadow DOM、模板与插槽、声明式 Shadow DOM、跨影子边界样式、表单关联自定义元素及无障碍要求。在构建可复用 UI 组件、设计系统或服务器端渲染的自定义元素时使用。","calculate-event-differentials":"计算日期和时间之间的持续时长与剩余时间。","capture-location-agnostic-data":"记录不应随用户所在地变化的日期时间数据，例如出生日期、周期性闹钟或国家法定节假日。","coordinate-global-events":"安排未来会议或活动时，明确绑定其所在地区的 IANA 时区，确保夏令时切换及调钟时出现“跳过”或“重复”的小时仍能得到准确的活动时间。","format-human-readable-durations":"以易读的本地化格式向用户显示已用时间或持续时长，并按上下文选择详细单位分解（如“1 小时 30 分钟”）或单位总数（如“90 分钟”）。","manage-recurring-intervals":"计算订阅计费或薪资发放等周期性区间，自动处理月末转换等边界情况（如在 1 月 31 日上增加一个月），确保周期计算准确。","model-partial-time-concepts":"为本身缺少年、日或日期等标准组成部分的日期时间概念建模，避免使用会引入计算错误的任意占位值。","stabilize-reactive-state":"在数据驱动视图中管理任务截止时间或日程，避免共享可变状态造成意外副作用。","support-global-calendar-systems":"面向国际用户，准确显示并计算非公历历法中的日期，例如伊斯兰历、希伯来历或农历。","batch-analytics-events":"对多个分析事件进行防抖处理，并合并到单次信标请求中发送，减少网络争用与服务器负载，同时仍能提供实时更新。","break-up-long-tasks":"拆分繁重的同步处理（复杂计算或长循环）及 DOM 更新，让浏览器有机会处理用户输入并重绘屏幕。","calculate-total-foreground-time":"计算用户实际查看页面的总时长，排除标签页处于后台的时间。","conditional-async-dependencies":"有条件地加载或初始化异步依赖（如为缺失的 Web 功能导入 polyfill），无需对页面的所有脚本依赖进行复杂编排。","defer-rendering-heavy-content":"推迟渲染用户暂时看不到的内容，缩短长信息流、大量文章或复杂仪表盘等内容密集页面的渲染时间。","defer-work-until-scroll-ends":"将 DOM 更新、数据获取、分析跟踪或布局重算等高开销操作推迟到滚动结束后执行，保持滚动流畅。","deliver-optimized-decorative-images":"同时提供 AVIF、WebP 等新一代格式与 1x、2x 等多种像素密度的装饰性图片（背景、UI 图标或复杂蒙版），让浏览器根据设备能力选择文件大小与视觉质量的最佳组合。","deprioritize-background-fetches":"降低通过 Fetch API 发起的后台数据请求优先级，避免与用户发起的请求争用网络。","detect-initial-visibility-state":"可靠判断页面最初是否在后台加载，即使脚本是在用户将页面切到前台后才异步加载，也能正确识别。","efficient-background-processing":"组件移出屏幕时暂停后台 JavaScript 执行（如 &lt;canvas&gt; 动画、WebGL 渲染或高频 WebSocket 数据轮询），滚回视野时再及时恢复，以节省系统资源和电池电量。","faster-spa-view-transitions":"保留单页应用（SPA）中已访问视图的 DOM 结构状态，避免每次导航都销毁并重建，从而加快返回这些视图的速度。","flicker-free-client-side-ab-testing":"使用客户端 JavaScript 修改或注入 HTML、CSS 与 JavaScript 来呈现 A/B 测试、多变量测试等实验，避免先显示原内容再闪烁切换到实验内容。","full-session-analytics":"在用户整个页面访问期间可靠跟踪分析、错误与遥测数据，并推迟到用户离开页面时再发送。","identify-heavy-scripts":"找出造成长动画帧的主要脚本。","identify-inp-causes":"找出影响 INP 指标的运行缓慢的 JavaScript。","improve-next-page-load-performance":"通过预取或预渲染用户可能接下来访问的页面来提升页面加载性能。","interaction-paint-timing":"测量用户交互和客户端导航从发生到屏幕上呈现有实际内容的更新所需的时间。","interactions-in-complex-layouts":"在数据密集仪表盘或电子表格网格等复杂布局中避免布局重算，提高交互响应速度，降低交互到下一次绘制（INP）延迟。","lazy-load-video-and-audio":"将屏幕外音视频资源（包括视频封面与预加载媒体数据）的下载推迟到播放器接近视口时，以节省带宽并减少页面初始加载时的网络争用。","optimize-image-priority":"提高最大内容绘制（LCP）候选图片的加载优先级，降低非关键图片的优先级，减少关键资源的加载延迟。","optimize-preload-priority":"优化预加载内容的相对优先级，减少关键资源的加载延迟。","optimize-script-priority":"提高关键异步脚本的优先级，降低非必要脚本或位于正文后部脚本的优先级，以优化加载顺序并减少延迟。","out-of-order-html-streaming":"通过后续流式传入同一 HTML 文档的内容，或通过命令式 JavaScript API，以声明方式更新页面。","resolution-optimized-pseudo-elements":"在 CSS 伪元素（如 ::before 和 ::after）中使用针对分辨率优化的图片，以减少 DOM 节点数量。","schedule-tasks-by-priority":"按不同优先级调度任务，确保关键工作先执行，并推迟后台工作。","sequence-distributed-events":"记录纳秒精度的时间戳，在分布式微服务或高吞吐量跟踪环境中记录操作并确定其顺序。","privacy":"面向 Web 开发者的实践指南，涵盖隐私设计、数据最小化、第三方审查和安全数据处理。在设计应用、集成第三方服务、处理用户数据或配置安全响应头时使用。","migrate-web-app-origin":"将已安装的 Web 应用迁移到新的源，同时保留用户配置与操作系统级快捷方式。","client-side-encryption":"通过公钥封装或密钥协商建立共享秘密，支持混合及后量子保护，并在浏览器中使用认证加密来加密敏感数据。","digital-signatures":"使用传统或抗量子（后量子）非对称密钥，在浏览器中对消息、令牌或产物进行签名与验证，确保数据完整性和真实性。","local-network-access":"从公共 Web 应用访问用户本地网络或回环接口上的资源。","passkey-authentication":"让回访用户使用通行密钥完成主要登录认证。","passkey-conditional-create":"在现有用户成功使用密码登录后，静默注册通行密钥。","passkey-management":"让用户查看并管理已注册到其账号的通行密钥。","passkey-reauthentication":"在敏感操作前，使用已登录用户现有的通行密钥再次验证身份。","passkey-registration":"为现有用户账号注册通行密钥。","passkeys":"全面介绍在 Web 应用中实现 WebAuthn 与通行密钥的整体原则。在处理通行密钥注册、认证、管理或重新认证时使用。","restrict-outbound-connections":"将页面或工作线程的通信限制在明确列出的网络端点白名单内，防止未经授权的第三方请求和客户端数据外传。","sanitize-untrusted-html":"移除不安全的元素与属性，安全解析并显示用户输入中的不可信 HTML 内容。","trusted-types":"限制危险的 DOM 写入点，使其拒绝原始字符串、仅接受经过策略验证的 HTML，帮助防范基于 DOM 的 XSS 攻击。","validate-origins":"在跨文档消息和 URL 中安全比较并验证 Web 源与站点，避免容易出错的字符串解析。","verify-email-ownership":"在账号创建、登录或恢复过程中验证用户对邮箱的所有权，无需发送一次性验证码或魔法链接邮件。","carousel-slide-effects":"创建包含图片等视觉元素的轮播，使每一项在进入、居中或离开滚动容器时播放动画，例如淡入淡出、旋转或缩放。","component-specific-light-dark-theme":"让代码块、媒体播放器等特定元素独立于页面 color-scheme，固定使用浅色或深色模式。","position-aware-tooltips":"构建带方向箭头等视觉样式的工具提示和弹出层，在元素翻转到备用位置时自动将箭头调整到正确方向。","pull-to-reveal":"构建下拉揭示功能，让用户向下拉动屏幕以显示搜索栏等更多内容。","resilient-context-menus-and-nested-dropdowns":"构建无障碍、响应式的菜单、工具提示、下拉菜单或上下文浮层，使其锚定特定 UI 元素，并在触及视口边缘时自动重新定位（如翻转轴向），避免被裁切。","responsive-table":"构建具有正确表头语义的数据表，使其在小屏幕和辅助技术下仍易于阅读和导航。","scroll-position-aware-elements":"构建返回顶部、滚动到底部或聊天入口等浮动按钮或微件，根据用户是否发生滚动来显示或隐藏。","scroll-progress-indicator":"创建滚动进度条、分步进度指示器或其他视觉提示，展示用户已滚过页面或区段的比例。","scrollability-affordance-hints":"构建滚动阴影、渐变淡出或方向箭头提示，仅在对应方向确实还有可滚动内容时显示。","shrinking-header-on-scroll":"使固定页头或全页封面在预定的滚动距离内平滑缩小、增加阴影并改变布局。","state-aware-sticky-headers":"构建粘性区段标题或导航栏，在实际吸附到顶部时改变配色或增加阴影。","anchor-positioning-tab-underline":"使元素在两个目标元素的位置之间平滑过渡，例如将选项卡下划线从先前选中项移动到当前选中项。","animate-element-entry-exit":"在元素加入或移出 DOM，或切换 display 值时，平滑显示或隐藏元素。","animate-to-from-top-layer":"为对话框、弹出层和工具提示等元素进入或退出顶层的过程添加动画。","carousel-snap-highlights":"在滚动吸附轮播、图库或全页滑动界面中，突出显示当前吸附的非交互项，例如吸附时放大卡片或揭示隐藏内容。","consistent-cross-document-transitions":"在启动跨文档视图过渡前，确保页面关键状态已加载并稳定：关键 CSS 已加载应用，关键 JavaScript 已加载运行，且用户初始可见区域的 HTML 已解析。","cross-document-transitions":"在整页导航间创建平滑连贯的过渡，例如交叉淡入淡出、自定义揭示效果，或内容从一个页面到下一个页面的形变。","custom-button-actions":"通过声明式按钮命令、调用器命令、自定义命令或声明式切换动作，将按钮连接到任意元素，以触发应用特定的自定义操作。","declarative-dialog-popover-control":"通过按钮切换对话框或弹出层的可见性，无需编写 JavaScript。","directional-navigation-transitions":"根据用户导航方向播放状态变化动画，例如前进时从右侧滑入新内容，返回上一屏时从左侧滑入。","drag":"支持通过拖动在页面上移动浮动元素。","dynamic-sibling-animations":"根据元素在同级列表中的位置计算延迟，错开各同级元素的动画或过渡开始时间。","group-element-transitions":"使用相同过渡逻辑同时移动一组相似元素，例如从购物车移除商品时，其余商品以动画移动到新位置。","highlight-text-ranges":"高亮页面中的任意文本范围，例如搜索结果、拼写错误或协同编辑光标。","interactive-content-reveal":"创建交互式揭示效果，例如聚光灯跟随用户指针，揭示图片或界面区段中的细节。","interest-triggered-action-previews":"在用户通过悬停、聚焦或长按表达兴趣、但尚未点击按钮时，实时预览该按钮的效果。","interest-triggered-tooltips":"在用户悬停、聚焦或长按交互元素时显示工具提示或补充信息，无需点击。","light-dismiss-a-dialog":"创建可通过轻触关闭的模态对话框，即点击或轻触对话框外部即可关闭。","motion":"使用 CSS 过渡、动画、滚动驱动动画与视图过渡制作界面动效，同时让动画在合成器上运行并遵循减少动态效果的偏好。","move-dom-element-without-losing-state":"移动 DOM 元素或改变其父节点时，保留重要状态，例如交互状态（:focus/:active）、&lt;iframe&gt; 加载状态、动画或过渡状态等。","parallax-scroll-effects":"创建视差等滚动效果，让前景与背景图层以不同速率移动，在用户滚动时产生纵深感。","persistent-top-layer-ui":"在底层 DOM 节点被移动或改变父节点时，使模态对话框、全屏元素或原生弹出层仍保持可见、打开且功能正常。","physics-based-easing":"创建弹跳、弹簧等基于物理的自定义动画与过渡，使效果比传统缓动曲线更自然、更生动。","platform-controls-dismiss-dialog":"创建可通过平台标准操作关闭的模态对话框，例如桌面端按 Esc 键，或移动端使用“返回”或“关闭”手势。","prevent-page-scroll-under-modal-dialog":"在模态对话框打开期间，阻止底层页面滚动。","same-document-transitions":"在单页应用（SPA）的不同页面状态或导航之间，让持续存在的元素通过大小、位置或其他样式属性的平滑形变形成视觉衔接，例如将商品缩略图展开为通栏主图。","scroll-completion-effects":"仅在通过程序平滑滚动到目标元素并完全结束后，才在该元素上触发视觉效果、动画或焦点变化。","scroll-entry-exit-effects":"在用户滚动时，为进入或离开滚动区域（或视口）的元素创建淡入、放大或其他复杂揭示效果。","scroll-snap-realtime-feedback":"在用户滚过吸附对齐内容、且滚动手势尚未结束时，在相关联的 UI 元素中提供实时视觉反馈。","scroll-snap-state-sync":"将导航指示器、关联内容面板和分析跟踪与滚动容器中当前吸附的项目保持同步。","scroll-target-on-load":"构建图片轮播或聊天线程等可滚动列表，使指定元素在首次渲染时就位于可见区域。","scrollytelling":"完全根据另一个元素的滚动区域位置驱动目标元素的视觉属性动画，例如背景遮罩淡入淡出、背景颜色变化或滚动叙事效果。","search-hidden-content":"通过手风琴、选项卡或“阅读更多”等模式隐藏内容，同时确保隐藏文字可在原生“在页面中查找”时自动展开、被搜索引擎索引、支持 URL 片段深链接，并保持 ARIA 无障碍支持。","spatial-navigation":"实现无障碍方向键空间导航，使其在网格等不同布局模式中均能正确工作。","swipe-to-remove":"让用户通过水平滑动来移除、归档或标记列表项为已读等，无需点击独立控件即可快速处理项目。","swipe-to-reveal":"让用户水平滑动列表项或内容面板，显示上下文操作按钮或侧边菜单，同时不自动触发操作。","checkbox":"自定义复选框图标、布局、颜色及选中和取消选中动画，同时保留原生功能和无障碍支持。","dark-mode-toggle":"构建深色模式开关，让用户可以为当前网站覆盖系统配色偏好。","hovercard":"构建悬浮卡片组件，在悬停特定类型的链接（如用户资料链接）时，显示目标页面的交互式结构化预览。","navigation-drawer":"创建导航抽屉：菜单按钮触发时从侧面滑入并覆盖现有页面内容；滑走、点击外部或按退出键时滑出关闭。","persistent-app-tours":"使用锚定元素的原生浮层创建持续显示的新手引导，让浮层在用户交互期间保持打开。","persistent-toast-notifications":"创建不打扰用户的轻提示和浮层通知，支持持续显示、堆叠消息与状态传达。","progress-ring":"构建直观表示任务或流程完成状态的环形进度组件，支持中心内容与符合品牌的样式。","scrollspy":"在导航菜单中高亮页面当前可见的区段。","spinner":"构建向所有用户传达忙碌状态的加载指示器，遵循减少动态效果的偏好，并高效播放动画。","stack-drill-down":"构建全屏分层导航，让用户逐层进入嵌套视图，并通过滑动或返回导航逐层退出，同时保持浏览器历史同步。","adapt-scrollbar-to-contrast-preferences":"为偏好高对比度界面的用户增强滚动条可见性。","apply-webgl-shaders":"使用 WebGL 着色器为 HTML 内容应用自定义视觉效果。","browser-ui-theming":"使用 CSS 为浏览器生成的文本选择、滚动条、表单控件和选择面板等界面设置主题，无需用自定义元素重新实现。","color":"Web 色彩指南，涵盖对比度要求、明暗配色、强制颜色模式，以及根据基色生成明暗色阶。","complex-shapes":"将元素及其内容裁剪为符号、笔触或自然纹理等任意自由形状，增强设计表现力。","contrast-color":"为动态背景色选择对比度充分、易于阅读的文字颜色。","customize-scrollbar-color-and-thickness":"自定义滚动条颜色或粗细。","dark-mode":"实现遵循用户明暗主题偏好的深色模式，并相应调整滚动条、表单控件等浏览器界面。","equal-width-text-lines":"让多行标题或组合字标的每一行具有相同宽度，形成海报式或堆叠标题排版。与两端对齐不同，这里调整文字本身的尺寸以适应宽度，而非拉伸间距。","export-html-media-from-canvas":"在 canvas 中将动态 HTML 内容捕获并导出为图片或视频帧。","expose-canvas-content-to-browser-features":"向辅助技术、翻译或阅读模式等浏览器功能开放 canvas 中渲染的内容。","improve-text-layout-and-legibility":"让浏览器在换行时均衡各行长度，改善不超过数行的标题等短篇独立文本的布局与可读性。","interactive-content-in-3d-scenes":"将交互式 HTML 元素集成到 3D 场景中。","precise-text-alignment":"为任意字体的文字实现精确垂直对齐，例如让文字上下的视觉内边距完全相等，或与相邻图标、图片边缘齐平。","shaped-cutouts":"组合多个形状，为元素创建复杂镂空或挖空效果，例如添加凹口。","soft-edge-content-fade":"在内容边缘应用透明渐变，提示还有可滚动区域，或遮蔽付费墙后的文字。","typography":"Web 排版最佳实践，涵盖字号单位、行高、换行与行长均衡，以及随视口缩放的流式字号。","visual-effects":"使用 CSS 制作多层阴影、混合模式、颜色插值可预测的渐变，以及仅用渐变绘制的条纹、棋盘格、圆点和饼图等视觉效果。","visually-stable-font-fallbacks":"定义字体样式，使首选字体与备用字体相互切换时，文字仍然易读且视觉一致。","visually-stable-mixed-fonts":"定义字体样式，使同一文本块由多种字体共同渲染时，文字仍然易读且视觉一致。","visually-texture-content":"为元素应用逼真的风化与纹理图案，呈现自然、陈旧或实体材料质感。","cpp-on-the-web":"使用 Emscripten 将 C/C++ 编译为 WebAssembly。","agentic-forms":"使用 WebMCP 属性标注标准 HTML 表单，将客户端功能作为工具开放给 AI 智能体。","agentic-javascript-tools":"使用 WebMCP 命令式 API，通过程序将客户端 JavaScript 函数注册为 AI 智能体可用的工具。"};
  const allOfficialSkillsMap = {"Provides instructions for installing and using the `android` CLI. The `android` command-line tool is a critical tool for Android development and helps you create new Android projects, run Android apps on devices, manage and interact with Android virtual devices (including screenshots and UI inspection), manage Android SDK components, look up official Android documentation, and discover and install official Android skills.":"提供安装和使用 `android` CLI 的说明。`android` 命令行工具是 Android 开发的关键工具，可帮助你创建新 Android 项目、在设备上运行 Android 应用、管理和交互 Android 虚拟设备（包括截图和 UI 检查）、管理 Android SDK 组件、查阅官方 Android 文档，以及发现和安装官方 Android 技能。","Uses Chrome DevTools MCP for accessibility (a11y) debugging and auditing based on web.dev guidelines. Use when testing semantic HTML, ARIA labels, focus states, keyboard navigation, tap targets, and color contrast.":"基于 web.dev 指南使用 Chrome DevTools MCP 进行无障碍（a11y）调试与审核。在测试语义化 HTML、ARIA 标签、焦点状态、键盘导航、点击目标和色彩对比度时使用。","Uses Chrome DevTools via MCP for efficient debugging, troubleshooting and browser automation. Use when debugging web pages, automating browser interactions, analyzing performance, or inspecting network requests. This skill does not apply to `--slim` mode (MCP configuration).":"通过 MCP 使用 Chrome DevTools 进行高效调试、故障排查和浏览器自动化。在调试网页、自动化浏览器交互、分析性能或检查网络请求时使用。本技能不适用于 `--slim` 模式（MCP 配置）。","Guides debugging and optimizing Largest Contentful Paint (LCP) using Chrome DevTools MCP tools. Use this skill whenever the user asks about LCP performance, slow page loads, Core Web Vitals optimization, or wants to understand why their page's main content takes too long to appear. Also use when the user mentions \"largest contentful paint\", \"page load speed\", \"CWV\", or wants to improve how fast their hero image or main content renders.":"指导使用 Chrome DevTools MCP 工具调试和优化最大内容绘制（LCP）。当用户询问 LCP 性能、页面加载缓慢、Core Web Vitals 优化，或想了解为何页面主体内容呈现太慢时使用此技能。当用户提及“最大内容绘制”、“页面加载速度”、“CWV”，或希望提升首屏主图/主内容的渲染速度时也可使用。","Diagnoses and resolves memory leaks in JavaScript/Node.js applications. Use when a user reports high memory usage, OOM errors, or wants to analyze heapsnapshots or run memory leak detection tools like memlab.":"诊断并解决 JavaScript/Node.js 应用程序中的内存泄漏。当用户反馈高内存占用、OOM 内存溢出错误，或希望分析堆快照、运行如 memlab 等内存泄漏检测工具时使用。","Uses Chrome DevTools MCP and documentation to troubleshoot connection and target issues. Trigger this skill when list_pages, new_page, or navigate_page fail, or when the server initialization fails.":"使用 Chrome DevTools MCP 和文档排查连接与目标问题。当 list_pages、new_page 或 navigate_page 失败，或服务器初始化失败时触发此技能。","**STOP AND VERIFY**: Before running any command or tool that results in irreversible data loss, you MUST obtain explicit user consent.\nWhen in doubt, ask. It is better to wait for confirmation than to accidentally delete production data or critical project assets.\nUse this for:\n- SQL: DROP TABLE/VIEW/SCHEMA/DATABASE, TRUNCATE, or broad DELETE (missing WHERE or using 1=1).\n- Cloud Storage: gsutil rm or gcloud storage rm targeting production data or critical buckets.\n- Infrastructure: gcloud projects delete, deleting Spanner/BigQuery/Dataproc resources, deleting secrets, or KMS key destruction.":"【警示与验证】：在执行任何可能导致不可逆数据丢失的命令或工具之前，必须获得用户的明确许可。存疑时务必先确认，等待确认远好于误删生产数据或核心资产。适用于：SQL 中的 DROP TABLE/VIEW/SCHEMA/DATABASE、TRUNCATE 或无条件/泛化 DELETE；Cloud Storage 中针对生产数据或关键存储桶的 gsutil rm 或 gcloud storage rm；云基础设施中删除 GCP 项目、Spanner/BigQuery/Dataproc 资源、Secret 密钥或 KMS 密钥销毁。","**STOP AND VERIFY**: Before running any command or tool that results in irreversible data loss, you MUST obtain explicit user consent. When in doubt, ask. It is better to wait for confirmation than to accidentally delete production data or critical project assets. Use this for: - SQL: DROP TABLE/VIEW/SCHEMA/DATABASE, TRUNCATE, or broad DELETE (missing WHERE or using 1=1). - Cloud Storage: gsutil rm or gcloud storage rm targeting production data or critical buckets. - Infrastructure: gcloud projects delete, deleting Spanner/BigQuery/Dataproc resources, deleting secrets, or KMS key destruction.":"【警示与验证】：在执行任何可能导致不可逆数据丢失的命令或工具之前，必须获得用户的明确许可。存疑时务必先确认，等待确认远好于误删生产数据或核心资产。适用于：SQL 中的 DROP TABLE/VIEW/SCHEMA/DATABASE、TRUNCATE 或无条件/泛化 DELETE；Cloud Storage 中针对生产数据或关键存储桶的 gsutil rm 或 gcloud storage rm；云基础设施中删除 GCP 项目、Spanner/BigQuery/Dataproc 资源、Secret 密钥或 KMS 密钥销毁。","Leverages BigQuery's built-in machine learning and GenAI capabilities for advanced data analytics. Use when you need to write SQL queries that perform time-series forecasting, detect outliers, find key drivers, or leverage generative AI capabilities in BigQuery.":"充分利用 BigQuery 内置的机器学习与生成式 AI 能力进行高级数据分析。适用于编写 SQL 查询以执行时间序列预测、异常值检测、关键驱动因素挖掘，或在 BigQuery 中调用生成式 AI 模型场景。","Generates Python code using BigQuery DataFrames (BigFrames). Use by default for any Python data task involving BigQuery, including data processing, analysis, and machine learning. Don't use for SQL-first workflows or the google-cloud-bigquery client library — use bigquery-basics.":"使用 BigQuery DataFrames (BigFrames) 生成 Python 代码。默认适用于涉及 BigQuery 的任何 Python 数据任务，包括数据处理、统计分析和机器学习。切勿用于以 SQL 为主的工作流或使用原生 google-cloud-bigquery 客户端库的场景（请改用 bigquery-basics）。","Discovers and inspects BigQuery Data Transfer Service (DTS) configurations.":"发现并检查 BigQuery 数据传输服务 (DTS) 配置。","Provides an end-to-end journey for authoring a BigQuery property graph from your tables or from a model document/diagram (an ER diagram, an ontology, a semantic model): dataset discovery, candidate relationships verified against the data, a readable plan, and `CREATE PROPERTY GRAPH` DDL with schema best practices and semantic measures/dimensions, plus an opt-in verification suite for the landed graph. Use when creating or replacing a property graph, authoring a graph from a dataset or a document, or verifying relationships or suspicious edge counts. Don't use for querying an existing graph, for non-BigQuery graph databases, or for drawing/rendering diagrams.":"提供从数据表或模型文档/图表（ER 图、本体、语义模型）构建 BigQuery 属性图的端到端全流程支持：数据集发现、依据数据验证候选关系、可读性计划，以及包含架构最佳实践和语义度量/维度的 `CREATE PROPERTY GRAPH` DDL，并附带针对落地图的可选验证套件。在创建或替换属性图、从数据集或文档构建图，或验证关系及可疑边数量时使用。不要用于查询现有图、非 BigQuery 图数据库或绘制/渲染图表。","Provides guidelines and best practices for querying BigQuery property graphs and semantic graphs: native GQL (Graph Query Language) pattern matching, multi-hop and variable-length paths, aggregation, top-N, path extraction, output formatting (graph visualization with TO_JSON vs tabular), GRAPH_TABLE relational SQL integration, and semantic graph querying via the GRAPH_EXPAND TVF with starting-node view selection and AGG() measures. Also covers hybrid semantic search, combining `VECTOR_SEARCH` candidate generation with graph traversal when a node carries an embedding-backed property. Use when querying graph topology, node/edge connections, paths, or semantic measures over an existing BigQuery graph. Don't use for Cypher or non-BigQuery graph databases, or for creating/modifying a graph schema.":"提供查询 BigQuery 属性图和语义图的指南与最佳实践：原生 GQL（图查询语言）模式匹配、多跳与变长路径、聚合、Top-N、路径提取、输出格式化（使用 TO_JSON 可视化图 vs 表格形式）、GRAPH_TABLE 关系型 SQL 集成，以及通过带起始节点视图选择与 AGG() 度量的 GRAPH_EXPAND 表值函数 (TVF) 进行语义图查询。同时涵盖混合语义搜索，在节点包含基于嵌入向量的属性时结合 `VECTOR_SEARCH` 候选生成与图遍历。在查询现有 BigQuery 图的拓扑结构、节点/边连接、路径或语义度量时使用。不要用于 Cypher 或非 BigQuery 图数据库，或创建/修改图架构。","Provides BigQuery SQL query optimization techniques, execution best practices, and performance tuning rules for high-efficiency querying. Use when optimizing BigQuery SQL queries, reducing query costs, or designing performant SQL transformations.":"提供高效查询所需的 BigQuery SQL 查询优化技术、执行最佳实践和性能调优规则。在优化 BigQuery SQL 查询、降低查询成本或设计高性能 SQL 转换时使用。","Assists in provisioning instances/tables, designing performant schemas, and querying data in Bigtable. Use when designing Bigtable row keys, configuring column families, writing SQL queries or client library code (Java, Go, Python) for Bigtable, or diagnosing performance/hotspotting issues. Also use when provisioning Bigtable clusters using gcloud or cbt CLIs. Don't use for generic Cloud SQL administration.":"协助在 Bigtable 中配置实例/表、设计高性能架构以及查询数据。在设计 Bigtable 行键、配置列族、编写针对 Bigtable 的 SQL 查询或客户端库代码（Java、Go、Python），或诊断性能/热点问题时使用。在使用 gcloud 或 cbt CLI 配置 Bigtable 集群时也可使用。不要用于常规的 Cloud SQL 管理。","Build modern data apps, dashboards, and interactive reports using either\nReact + Vite or Streamlit. Includes optional Gemini Data Analytics chat\nintegration for an AI powered \"chat with your data\" experience.\n\nRelevant when any of the following conditions are true:\n1. User explicitly requests to build a data dashboard, data application, or visualization UI, and the UI pulls data from a GCP database (defaulting to BigQuery unless otherwise specified).\n2. You need to generate a frontend web application to interact with, query, and visualize data from GCP data sources.\n3. User wants to build a \"chat with your data\" experience or integrate the Gemini Data Analytics chat API into a web interface.\n\nDo NOT use when any of the following conditions are true:\n1. The request is for building backend-only services.\n2. The request is for simple CLI scripts or command-line applications.\n3. The web application is not data-centric or does not involve visualizing/querying data from GCP sources.":"使用 React + Vite 或 Streamlit 构建现代化数据应用、仪表盘和交互式报告。包含可选的 Gemini 数据分析对话集成，提供由 AI 驱动的“与数据对话”体验。在以下情况下使用：1. 用户明确要求构建数据仪表盘、数据应用或可视化界面，且界面从 GCP 数据库（默认 BigQuery）拉取数据；2. 需要生成前端 Web 应用来交互、查询和可视化 GCP 数据源；3. 用户希望构建“与数据对话”体验或将 Gemini 数据分析对话 API 集成到 Web 界面中。请勿用于纯后端服务、简单 CLI 脚本或非以数据为中心的通用 Web 应用。","Build modern data apps, dashboards, and interactive reports using either React + Vite or Streamlit. Includes optional Gemini Data Analytics chat integration for an AI powered \"chat with your data\" experience. Relevant when any of the following conditions are true: 1. User explicitly requests to build a data dashboard, data application, or visualization UI, and the UI pulls data from a GCP database (defaulting to BigQuery unless otherwise specified). 2. You need to generate a frontend web application to interact with, query, and visualize data from GCP data sources. 3. User wants to build a \"chat with your data\" experience or integrate the Gemini Data Analytics chat API into a web interface. Do NOT use when any of the following conditions are true: 1. The request is for building backend-only services. 2. The request is for simple CLI scripts or command-line applications. 3. The web application is not data-centric or does not involve visualizing/querying data from GCP sources.":"使用 React + Vite 或 Streamlit 构建现代化数据应用、仪表盘和交互式报告。包含可选的 Gemini 数据分析对话集成，提供由 AI 驱动的“与数据对话”体验。在以下情况下使用：1. 用户明确要求构建数据仪表盘、数据应用或可视化界面，且界面从 GCP 数据库（默认 BigQuery）拉取数据；2. 需要生成前端 Web 应用来交互、查询和可视化 GCP 数据源；3. 用户希望构建“与数据对话”体验或将 Gemini 数据分析对话 API 集成到 Web 界面中。请勿用于纯后端服务、简单 CLI 脚本或非以数据为中心的通用 Web 应用。","Configures (or reconfigures) the Google Cloud Data Agent Kit (DAK) plugin by checking gcloud and ADC credentials, collecting the GCP project ID, region, and services, and running its bundled `dak-setup` script. Use this proactively and without waiting to be asked whenever a SessionStart hook or any other system/context message reports that the Data Agent Kit plugin is not configured, is missing configuration, or needs to be reconfigured. Also use it whenever the user mentions setting up, configuring, reconfiguring, or changing the project, region, or service integrations for the Data Agent Kit or DAK plugin — even if they phrase it casually, like \"dak isn't working\" or \"I want to enable more GCP service integrations\".":"通过检查 gcloud 与 ADC 凭据、收集 GCP 项目 ID、区域及服务，并运行内置的 `dak-setup` 脚本，配置（或重新配置）Google Cloud Data Agent Kit (DAK) 插件。每当系统消息报告插件未配置或需要重新配置，或者用户提及设置、配置或修改 DAK 插件的项目与服务集成时，主动使用此技能。","Automated data quality and transformation capabilities for Dataform/dbt/BigQuery":"针对 Dataform/dbt/BigQuery 的自动化数据质量检测与转换能力","Expertise in generating clean, correct, and efficient Dataform pipeline":"生成整洁、正确且高效的 Dataform 管道的专业技能","Expert guidance for creating, modifying, and optimizing dbt pipelines":"创建、修改和优化 dbt 管道的专家指南","Finds and inspects data assets within Google Cloud.\nRelevant when any of the following conditions are true:\n1. The user request involves finding, exploring, or inspecting data assets\nin Google Cloud, such as:\n- BigQuery datasets, tables, or views\n- BigLake catalog or tables\n- Spanner instances, databases or tables\n- etc.\n2. You need to retrieve the schema, metadata, or governance policies for a\nGCP data asset.\n3. You have a keyword or topic (e.g., \"sales data\") but lack the specific\ntable or resource ID.\n4. You are attempting to find data using `bq ls`, as this skill offers a\nsuperior approach.\nDon't use when:\n- Assets are outside Google Cloud":"在 Google Cloud 中查找并检查数据资产。在以下情况使用：1. 用户需求涉及查找、探索或检查 Google Cloud 数据资产（如 BigQuery 数据集/表/视图、BigLake 目录/表、Spanner 实例/数据库/表等）；2. 需要获取 GCP 数据资产的架构、元数据或治理策略；3. 拥有关键词或主题（如“销售数据”）但缺少具体表名或资源 ID；4. 准备使用 `bq ls` 查找数据（此技能提供更佳方式）。请勿用于非 Google Cloud 资产。","Finds and inspects data assets within Google Cloud. Relevant when any of the following conditions are true: 1. The user request involves finding, exploring, or inspecting data assets in Google Cloud, such as: - BigQuery datasets, tables, or views - BigLake catalog or tables - Spanner instances, databases or tables - etc. 2. You need to retrieve the schema, metadata, or governance policies for a GCP data asset. 3. You have a keyword or topic (e.g., \"sales data\") but lack the specific table or resource ID. 4. You are attempting to find data using `bq ls`, as this skill offers a superior approach. Don't use when: - Assets are outside Google Cloud":"在 Google Cloud 中查找并检查数据资产。在以下情况使用：1. 用户需求涉及查找、探索或检查 Google Cloud 数据资产（如 BigQuery 数据集/表/视图、BigLake 目录/表、Spanner 实例/数据库/表等）；2. 需要获取 GCP 数据资产的架构、元数据或治理策略；3. 拥有关键词或主题（如“销售数据”）但缺少具体表名或资源 ID；4. 准备使用 `bq ls` 查找数据（此技能提供更佳方式）。请勿用于非 Google Cloud 资产。","Enforces resource attribution for CLI commands. Use this skill whenever you are running `bq` or `gcloud` commands via `run_command`. It ensures mandatory labeling for supported `bq` operations while avoiding invalid flags on read-only commands.":"为 CLI 命令强制实施资源归属标签。每当通过 `run_command` 运行 `bq` 或 `gcloud` 命令时使用此技能。确保对受支持的 `bq` 操作添加强制性标签，同时避免在只读命令上添加无效参数。","Sets up Google Cloud Lakehouse federated catalogs to remote Iceberg REST Catalogs. Currently supported catalogs: Databricks Unity, AWS Glue. Supported clouds hosting those catalogs: GCP, AWS. The primary use case is connecting to remote data to query it from GCP engines (BigQuery, Spark). Examples of when to use this: \"federate my lakehouse catalog to databricks\", \"query data in databricks\", \"query data in s3\", \"connect to aws glue\". Do NOT use for direct remote database SQL execution (e.g., Databricks SQL) or managing remote clusters and infrastructure (e.g., Databricks clusters, AWS Glue jobs).":"设置 Google Cloud 湖仓一体联合目录以连接到远程 Iceberg REST 目录。当前支持的目录包括：Databricks Unity、AWS Glue。托管这些目录的支持云平台包括：GCP、AWS。主要应用场景是连接远程数据以便从 GCP 引擎（BigQuery、Spark）进行查询。使用示例：“将我的湖仓目录联合到 databricks”、“查询 databricks 中的数据”、“查询 s3 中的数据”、“连接到 aws glue”。不要用于直接执行远程数据库 SQL（例如 Databricks SQL）或管理远程集群与基础设施（例如 Databricks 集群、AWS Glue 作业）。","Provides expert guidance for troubleshooting Cloud Composer (Apache":"提供关于排查 Cloud Composer（Google Cloud 上的 Apache Airflow）故障的专家指导","Primary entry point for building, managing, and orchestrating data pipelines":"在 Google Cloud 上构建、管理和编排数据流水线的主要入口","Guides writing, packaging, executing, and troubleshooting Apache Beam pipelines on Dataflow. Use when creating new pipelines, configuring Flex Templates, or analyzing performance of Dataflow jobs. Capabilities include Java/Python/Go setup, Cloud Build integration, and deep diagnostic analysis of job health and autoscaling.  Use when: - Creating an Apache Beam Dataflow pipeline. - Creating a Google Dataflow Flex Template. - Using an existing Google Dataflow Template. - Debugging Dataflow pipeline - Troubleshooting Dataflow pipeline - Analyzing Performance of Dataflow pipeline.  Key capabilities: Java/Python/Go project setup, Flex Templates (with Cloud Build), and diagnostics for streaming job health, bottlenecks, and autoscaling.  Do NOT use for: - General GCP resource management unrelated to Dataflow. - Issues with other GCP services (e.g., GCE, GCS, BigQuery) unless directly impacting Dataflow pipeline execution. - Pipeline technologies other than Apache Beam on Dataflow.":"指导在 Dataflow 上编写、打包、执行和排查 Apache Beam 管道故障。在创建新管道、配置 Flex 模板或分析 Dataflow 作业性能时使用。具备 Java/Python/Go 项目配置、Cloud Build 集成，以及对作业健康状况和自动缩放的深度诊断分析能力。在以下场景使用：- 创建 Apache Beam Dataflow 管道；- 创建 Google Dataflow Flex 模板；- 使用现有 Google Dataflow 模板；- 调试/排查/分析 Dataflow 管道性能。不要用于：- 与 Dataflow 无关的常规 GCP 资源管理；- 其他 GCP 服务的问题（除非直接影响 Dataflow 管道执行）；- Dataflow 上 Apache Beam 之外的管道技术。","Guides writing, packaging, executing, and troubleshooting Apache Beam pipelines on Dataflow. Use when creating new pipelines, configuring Flex Templates, or analyzing performance of Dataflow jobs. Capabilities include Java/Python/Go setup, Cloud Build integration, and deep diagnostic analysis of job health and autoscaling. Use when: - Creating an Apache Beam Dataflow pipeline. - Creating a Google Dataflow Flex Template. - Using an existing Google Dataflow Template. - Debugging Dataflow pipeline - Troubleshooting Dataflow pipeline - Analyzing Performance of Dataflow pipeline. Key capabilities: Java/Python/Go project setup, Flex Templates (with Cloud Build), and diagnostics for streaming job health, bottlenecks, and autoscaling. Do NOT use for: - General GCP resource management unrelated to Dataflow. - Issues with other GCP services (e.g., GCE, GCS, BigQuery) unless directly impacting Dataflow pipeline execution. - Pipeline technologies other than Apache Beam on Dataflow.":"指导在 Dataflow 上编写、打包、执行和排查 Apache Beam 管道故障。在创建新管道、配置 Flex 模板或分析 Dataflow 作业性能时使用。具备 Java/Python/Go 项目配置、Cloud Build 集成，以及对作业健康状况和自动缩放的深度诊断分析能力。在以下场景使用：- 创建 Apache Beam Dataflow 管道；- 创建 Google Dataflow Flex 模板；- 使用现有 Google Dataflow 模板；- 调试/排查/分析 Dataflow 管道性能。不要用于：- 与 Dataflow 无关的常规 GCP 资源管理；- 其他 GCP 服务的问题（除非直接影响 Dataflow 管道执行）；- Dataflow 上 Apache Beam 之外的管道技术。","Guides the authoring and validation of Apache Airflow DAGs for Managed Service for Apache Airflow (MSAA; formerly Cloud Composer). Covers environment context discovery, Airflow 2 vs 3 compatibility, authoring best practices, and local/remote validation processes. Use when creating or extending an Airflow DAG. Don't use when authoring Python code unrelated to Airflow DAGs.":"指导为 Apache Airflow 托管服务（MSAA；原 Cloud Composer）编写和验证 Apache Airflow DAG。涵盖环境上下文探测、Airflow 2 与 3 兼容性、编写最佳实践以及本地/远程验证流程。在创建或扩展 Airflow DAG 时使用。编写与 Airflow DAG 无关的通用 Python 代码时请勿使用。","Provides guidance for migrating Apache Airflow DAGs in Managed Service for Apache Airflow (MSAA; formerly Cloud Composer). Covers migration to Airflow 2.11.1 (MSAA Gen 2 and 3) and Airflow 3 (MSAA Gen 3), including environment inspection, GCS download/upload and scanning patterns for breaking changes.":"为 Apache Airflow 托管服务（MSAA；原 Cloud Composer）中的 Apache Airflow DAG 迁移提供指引。涵盖迁移至 Airflow 2.11.1（MSAA 第 2 代和第 3 代）及 Airflow 3（MSAA 第 3 代），包括环境检查、GCS 下载/上传以及扫描破坏性变更模式。","Provides recommendations and best practices for creating, configuring, tuning and optimizing Managed Service for Apache Airflow (MSAA, Cloud Composer) environments. Use when the user asks for guidance, recommendations, or best practices on configuring Cloud Composer, scaling Airflow environments, preventing workload restarts, or analyzing system health.":"提供创建、配置、调优和优化托管式 Apache Airflow 服务（MSAA，即 Cloud Composer）环境的建议与最佳实践。当用户就配置 Cloud Composer、扩展 Airflow 环境、防止工作负载重启或分析系统健康状况寻求指导、建议或最佳实践时使用。","Upgrades GCP Spark/Dataproc jobs to newer versions by analyzing, remediating, and testing job on target image version.\nUse when:\n- Upgrading Spark/Dataproc versions (major, minor, or sub-minor).\nExample prompt:\n\"Upgrade Dataproc job [job_id] in project [project_id], region [region] to target image version [target_version]. Temporary staging: [gcs_staging_path], Target GCS bucket: [gcs_target_path]\"\nDon't use when:\n- Writing new Spark code.\n- Migrating non-Spark workloads (e.g., Hive/Flink to Spark).\nLimitation: This skill does not support data/result validation currently.":"通过在目标映像版本上分析、修复和测试作业，将 GCP Spark/Dataproc 作业升级到较新版本。在以下场景使用：- 升级 Spark/Dataproc 版本（主版本、次版本或补丁版本）。示例提示：“将项目 [project_id]、区域 [region] 中的 Dataproc 作业 [job_id] 升级到目标映像版本 [target_version]...”。不要在以下场景使用：- 编写新 Spark 代码；- 迁移非 Spark 工作负载（如 Hive/Flink 迁移到 Spark）。限制：此技能当前不支持数据/结果验证。","Upgrades GCP Spark/Dataproc jobs to newer versions by analyzing, remediating, and testing job on target image version. Use when: - Upgrading Spark/Dataproc versions (major, minor, or sub-minor). Example prompt: \"Upgrade Dataproc job [job_id] in project [project_id], region [region] to target image version [target_version]. Temporary staging: [gcs_staging_path], Target GCS bucket: [gcs_target_path]\" Don't use when: - Writing new Spark code. - Migrating non-Spark workloads (e.g., Hive/Flink to Spark). Limitation: This skill does not support data/result validation currently.":"通过在目标映像版本上分析、修复和测试作业，将 GCP Spark/Dataproc 作业升级到较新版本。在以下场景使用：- 升级 Spark/Dataproc 版本（主版本、次版本或补丁版本）。示例提示：“将项目 [project_id]、区域 [region] 中的 Dataproc 作业 [job_id] 升级到目标映像版本 [target_version]...”。不要在以下场景使用：- 编写新 Spark 代码；- 迁移非 Spark 工作负载（如 Hive/Flink 迁移到 Spark）。限制：此技能当前不支持数据/结果验证。","This skill helps the agent generate or update orchestration pipeline":"帮助智能体生成或更新编排管道的技能","Automates declarative resource creation and provisioning for data pipelines, supporting BigQuery, Dataform, Dataproc, BigQuery Data Transfer Service (DTS), and other resources. It manages environment-specific configurations (dev, staging, prod) through a deployment.yaml file.\nUse when:\n- Modifying or creating deployment.yaml for deployment settings.\n- Resolving environment-specific variables (e.g., Project IDs, Regions) for deployment.\n- Provisioning supported infrastructure like BigQuery datasets/tables, Dataform resources, or DTS resources via deployment.yaml.\nDo not use when:\n- Resources already exist.\n- Managing resources not supported by `gcloud beta orchestration-pipelines resource-types list`.\n- Managing general cloud infrastructure (VMs, networks, Kubernetes, IAM policies), which are better suited for Terraform.\n- Infrastructure spans multiple cloud providers (AWS, Azure, etc.).\n- Already uses Terraform for the target resources.":"为数据流水线自动化声明式资源创建和预配，支持 BigQuery、Dataform、Dataproc、BigQuery 数据传输服务 (DTS) 等资源。通过 deployment.yaml 文件管理特定环境（dev、staging、prod）的配置。在修改或创建 deployment.yaml、解析部署的环境变量，或通过 deployment.yaml 预配受支持的基础设施时使用。请勿用于资源已存在、管理通用云基础设施（VM、网络、K8s，更适合 Terraform）或跨多云提供商的场景。","Automates declarative resource creation and provisioning for data pipelines, supporting BigQuery, Dataform, Dataproc, BigQuery Data Transfer Service (DTS), and other resources. It manages environment-specific configurations (dev, staging, prod) through a deployment.yaml file. Use when: - Modifying or creating deployment.yaml for deployment settings. - Resolving environment-specific variables (e.g., Project IDs, Regions) for deployment. - Provisioning supported infrastructure like BigQuery datasets/tables, Dataform resources, or DTS resources via deployment.yaml. Do not use when: - Resources already exist. - Managing resources not supported by `gcloud beta orchestration-pipelines resource-types list`. - Managing general cloud infrastructure (VMs, networks, Kubernetes, IAM policies), which are better suited for Terraform. - Infrastructure spans multiple cloud providers (AWS, Azure, etc.). - Already uses Terraform for the target resources.":"为数据流水线自动化声明式资源创建和预配，支持 BigQuery、Dataform、Dataproc、BigQuery 数据传输服务 (DTS) 等资源。通过 deployment.yaml 文件管理特定环境（dev、staging、prod）的配置。在修改或创建 deployment.yaml、解析部署的环境变量，或通过 deployment.yaml 预配受支持的基础设施时使用。请勿用于资源已存在、管理通用云基础设施（VM、网络、K8s，更适合 Terraform）或跨多云提供商的场景。","Develops, optimizes and runs PySpark/Spark code on Managed Spark (Dataproc\nclusters and Serverless) on Google Cloud.\nUse when:\n- Authoring or running Spark/PySpark notebooks (any kernel), incl. data\nanalysis, reports and visualizations.\n- Writing Spark ETL pipelines or preparing workloads for production.\n- Training or running inference with ML models on Spark.\n- Optimizing PySpark or Spark SQL for performance, memory, or OOM risks.\n- Managing Spark clusters, jobs, batches, and interactive sessions.\nDon't use when:\n- Writing generic Python that doesn't use Spark.\n- Performing simple SQL queries that can be done directly in BigQuery.\n- Troubleshooting failed Spark workloads (use @skill:gcp-spark-troubleshooting).":"在 Google Cloud 托管 Spark（Dataproc 集群和 Serverless）上开发、优化和运行 PySpark/Spark 代码。在编写或运行 Spark/PySpark Notebook（含数据分析、报告和可视化）、编写 Spark ETL 流水线、在 Spark 上训练或运行 ML 模型推理、针对性能/内存/OOM 优化 PySpark 或 Spark SQL，以及管理 Spark 集群、作业、批处理和交互式会话时使用。请勿用于不使用 Spark 的通用 Python，或直接在 BigQuery 中完成的简单 SQL 查询。","Develops, optimizes and runs PySpark/Spark code on Managed Spark (Dataproc clusters and Serverless) on Google Cloud. Use when: - Authoring or running Spark/PySpark notebooks (any kernel), incl. data analysis, reports and visualizations. - Writing Spark ETL pipelines or preparing workloads for production. - Training or running inference with ML models on Spark. - Optimizing PySpark or Spark SQL for performance, memory, or OOM risks. - Managing Spark clusters, jobs, batches, and interactive sessions. Don't use when: - Writing generic Python that doesn't use Spark. - Performing simple SQL queries that can be done directly in BigQuery. - Troubleshooting failed Spark workloads (use @skill:gcp-spark-troubleshooting).":"在 Google Cloud 托管 Spark（Dataproc 集群和 Serverless）上开发、优化和运行 PySpark/Spark 代码。在编写或运行 Spark/PySpark Notebook（含数据分析、报告和可视化）、编写 Spark ETL 流水线、在 Spark 上训练或运行 ML 模型推理、针对性能/内存/OOM 优化 PySpark 或 Spark SQL，以及管理 Spark 集群、作业、批处理和交互式会话时使用。请勿用于不使用 Spark 的通用 Python，或直接在 BigQuery 中完成的简单 SQL 查询。","Provides expert guidance for troubleshooting Google Cloud Spark and Dataproc workloads (Dataproc Serverless batches and standard Dataproc clusters), and inspecting, streaming, searching, tailing, or summarizing Spark driver outputs and event logs in Cloud Storage. Use when the user asks to debug, troubleshoot, diagnose, or perform Root Cause Analysis (RCA) on failed Spark jobs, PySpark batches, or Spark event logs.":"提供针对 Google Cloud Spark 和 Dataproc 工作负载（Dataproc Serverless 批处理与标准 Dataproc 集群）的专家级排错指导，并检查、流式传输、搜索、追踪或总结 Cloud Storage 中的 Spark driver 输出与事件日志。当用户要求调试、排查、诊断或对失败的 Spark 作业、PySpark 批处理或 Spark 事件日志执行根本原因分析（RCA）时使用。","Assesses the security posture of Google Cloud Storage (GCS) buckets and projects. Grounds every finding in gathered telemetry, evaluates buckets against Google security best practices (public access, IAM over-granting, CMEK, VPC Service Controls, audit logging), and correlates signals to flag toxic combinations of individually low-risk settings, with actionable remediation. Use whenever a user asks for a security scan, audit, review, vulnerability check, or compliance assessment (including SAIF) — or simply asks whether their buckets, project, or data are secure, exposed, public, or misconfigured, who can access their data, or wants storage hardened or locked down, e.g. before a launch. Don't use for diagnosing a specific access failure or 403, managing or configuring storage, investigating a live outage, or non-GCS resources (Compute Engine, GKE, etc.).":"评估 Google Cloud Storage (GCS) 存储桶和项目的安全状况。将每项调查结果建立在收集的遥测数据之上，对照 Google 安全最佳实践（公共访问、IAM 过度授权、CMEK、VPC Service Controls、审计日志）评估存储桶，并关联信号以标记单独看似低风险但组合起来存在危害的设置，同时提供可操作的修正方案。当用户要求进行安全扫描、审计、审查、漏洞检查或合规性评估（包括 SAIF）时，或者只是询问其存储桶、项目或数据是否安全、暴露、公开或配置错误、谁可以访问其数据，或希望在发布前强化或锁定存储时使用。不要用于诊断特定访问失败或 403 错误、管理或配置存储、调查实时故障，或非 GCS 资源（Compute Engine、GKE 等）。","Mandatory Step 0 pre-flight execution order and authentication verification for Google Cloud Platform (GCP), Application Default Credentials (ADC), gcloud CLI, Spark, Dataproc, BigQuery, GCS, and notebook runtimes. Use whenever interacting with GCP resources, running Spark/PySpark pipelines, BigQuery queries, GCS paths (gs://), or creating/running notebooks.":"针对 Google Cloud Platform (GCP)、应用默认凭据 (ADC)、gcloud CLI、Spark、Dataproc、BigQuery、GCS 和笔记本运行时的强制第 0 步预检执行顺序与身份验证核查。在与 GCP 资源交互、运行 Spark/PySpark 管道、BigQuery 查询、GCS 路径 (gs://) 或创建/运行笔记本时使用。","Stores, retrieves, and manages data as objects in Cloud Storage (Google Cloud Storage, or GCS) buckets. Use when you need to interact with Cloud Storage — set up a Storage MCP server (remote or local Toolbox), create or configure buckets, upload, download, stream, or transfer data, organize objects with folders, generate signed URLs, control access (IAM, ACLs, public access prevention), set storage classes (Standard, Nearline, Coldline, Archive), manage lifecycle and cost, protect data (versioning, CMEK, retention, Bucket Lock, holds, soft delete), host static websites, trigger Pub/Sub notifications, mount buckets (gcsfuse), or optimize performance. Covers gcloud storage / gsutil, JSON/XML APIs, client libraries, Terraform, and Cloud Storage MCP servers. Don't use for non-Storage MCP servers, block storage (Persistent Disk), BigQuery, or databases (Cloud SQL, Spanner, Bigtable, Firestore).":"在 Cloud Storage (Google Cloud Storage，即 GCS) 存储桶中以对象形式存储、检索和管理数据。当你需要与 Cloud Storage 交互时使用——设置 Storage MCP 服务器（远程或本地 Toolbox）、创建或配置存储桶、上传/下载/流式传输或转移数据、使用文件夹组织对象、生成已签名网址、控制访问权限（IAM、ACL、禁止公共访问）、设置存储类别（Standard、Nearline、Coldline、Archive）、管理生命周期与成本、保护数据（版本控制、CMEK、保留期、存储桶锁定、保全、软删除）、托管静态网站、触发 Pub/Sub 通知、挂载存储桶 (gcsfuse) 或优化性能。涵盖 gcloud storage / gsutil、JSON/XML API、客户端库、Terraform 和 Cloud Storage MCP 服务器。不要用于非 Storage MCP 服务器、块存储 (Persistent Disk)、BigQuery 或数据库（Cloud SQL、Spanner、Bigtable、Firestore）。","Creates Cloud Storage (Google Cloud Storage, or GCS) buckets. Analyzes the workload (sensitive data, media hosting, ingestion, web hosting, archiving, backup, logging, analytics, AI/ML, or general-purpose), validates project-level security settings, and designs a secure-by-default, cost-effective configuration (location, storage class, uniform bucket-level access, public access prevention, soft delete, lifecycle) before creating it. Use whenever a user wants to create, make, set up, provision, or spin up a bucket, or needs object storage for an app, service, pipeline, or dataset — even a \"simple\" or \"default\" bucket, or when bucket creation is one step in a larger workflow. Outputs or executes the creation via gcloud, the JSON/REST API, Terraform, or SDK client libraries (C++, Java, Python, Go). Don't use for anything other than creating new buckets — for uploads, downloads, access changes, or reconfiguring existing buckets, use google-cloud-storage-basics.":"创建 Cloud Storage (Google Cloud Storage，即 GCS) 存储桶。在创建之前分析工作负载（敏感数据、媒体托管、提取、Web 托管、归档、备份、日志记录、分析、AI/ML 或通用用途），验证项目级安全设置，并设计默认安全且具有成本效益的配置（位置、存储类别、统一存储桶级访问权限、禁止公共访问、软删除、生命周期）。当用户想要创建、设置、预配或启动存储桶，或者需要为应用、服务、管道或数据集提供对象存储时使用——即使是“简单”或“默认”的存储桶，或者当创建存储桶是更大工作流中的一步时。通过 gcloud、JSON/REST API、Terraform 或 SDK 客户端库（C++、Java、Python、Go）输出或执行创建。不要用于创建新存储桶之外的任何操作——对于上传、下载、权限变更或重新配置现有存储桶，应使用 google-cloud-storage-basics。","Mounts Cloud Storage buckets as a POSIX file system with Cloud Storage FUSE (gcsfuse). Use when you need to interact with gcsfuse — decide whether FUSE, native gs:// reads, or Filestore/Managed Lustre fits a workload, deploy tuned mounts on GKE, Compute Engine, or Cloud Run, enable and size the file, stat, and list caches, tune mount flags or config-file settings, apply workload profiles, keep ML checkpointing safe (rename atomicity, hierarchical namespace, close-time finalization, concurrent writers), or diagnose slow training, low throughput, or GCS bill spikes on existing mounts with gcsfuse metrics. Covers mount semantics, the gcsfuse CLI and config file, the GKE gcsfuse CSI driver (Workload Identity principal:// bindings, profile StorageClasses, sidecar sizing), and Cloud Run volume mounts. Don't use for bucket administration or data management without a mount (google-cloud-storage-basics) or for fully POSIX-compliant shared file systems (Filestore, Managed Lustre).":"使用 Cloud Storage FUSE (gcsfuse) 将 Cloud Storage 存储桶挂载为 POSIX 文件系统。当你需要与 gcsfuse 交互时使用——确定 FUSE、原生 gs:// 读取还是 Filestore/Managed Lustre 适合工作负载，在 GKE、Compute Engine 或 Cloud Run 上部署经过调优的挂载，启用并设置文件、stat 和 list 缓存大小，调整挂载标志或配置文件设置，应用工作负载配置文件，保障机器学习检查点安全性（重命名原子性、分层命名空间、关闭时定稿、并发写入器），或使用 gcsfuse 指标诊断现有挂载上的训练缓慢、低吞吐量或 GCS 账单骤增问题。涵盖挂载语义、gcsfuse CLI 和配置文件、GKE gcsfuse CSI 驱动程序（Workload Identity principal:// 绑定、配置文件 StorageClass、sidecar 规格配置）以及 Cloud Run 卷挂载。不要在没有挂载的情况下用于存储桶管理或数据管理（应使用 google-cloud-storage-basics），也不要用于完全符合 POSIX 规范的共享文件系统（Filestore、Managed Lustre）。","Ensures proper Python dependency management, avoiding global `pip install` and\nadhering to project-specific tooling.\n\nUse this skill if any of the following are true:\n1. Attempting to run `pip install {package_name}`.\n2. Python packages or dependencies need to be added or modified.\n3. Initiating a new Python project.\n4. Installing missing packages inside a notebook or Python project.\n5. Generating Python code that includes `import` statements for third-party libraries.\n6. Before executing Python scripts via the terminal to ensure the correct virtual environment is active.":"确保规范管理 Python 依赖项，避免全局 `pip install` 并遵循项目特定的工具链。在以下情况使用：1. 准备运行 `pip install {package_name}`；2. 需要添加或修改 Python 软件包与依赖项；3. 初始化新的 Python 项目；4. 在 Notebook 或 Python 项目中安装缺失的软件包；5. 生成包含第三方库 import 语句的 Python 代码；6. 在通过终端执行 Python 脚本前确保正确的虚拟环境已激活。","Ensures proper Python dependency management, avoiding global `pip install` and adhering to project-specific tooling. Use this skill if any of the following are true: 1. Attempting to run `pip install {package_name}`. 2. Python packages or dependencies need to be added or modified. 3. Initiating a new Python project. 4. Installing missing packages inside a notebook or Python project. 5. Generating Python code that includes `import` statements for third-party libraries. 6. Before executing Python scripts via the terminal to ensure the correct virtual environment is active.":"确保规范管理 Python 依赖项，避免全局 `pip install` 并遵循项目特定的工具链。在以下情况使用：1. 准备运行 `pip install {package_name}`；2. 需要添加或修改 Python 软件包与依赖项；3. 初始化新的 Python 项目；4. 在 Notebook 或 Python 项目中安装缺失的软件包；5. 生成包含第三方库 import 语句的 Python 代码；6. 在通过终端执行 Python 脚本前确保正确的虚拟环境已激活。","CRITICAL RULE: You MUST use this skill whenever the task involves any machine learning tasks or data analysis.\nUse this skill if the user's prompt or requirements mention any of the following:\n* Clustering\n* Classification\n* Regression\n* Time series forecasting\n* Statistical testing\n* Model comparison\n* ML\n* Data analysis\n\nSQL/BigQuery ML HANDOFF: If the user requires a SQL solution, use this skill to dictate the ANALYSIS STEPS (e.g., markdown analysis cells, visualization logic), but defer to `bigquery` for all SQL syntax.":"【核心规则】：每当任务涉及机器学习或数据分析时，必须使用此技能。当用户需求提及聚类、分类、回归、时间序列预测、统计假设检验、模型比较、机器学习 (ML) 或数据分析时使用。SQL / BigQuery ML 协作规范：如果用户需要 SQL 解决方案，使用此技能确定分析步骤（例如 Markdown 分析单元格、可视化逻辑），但具体的 SQL 语法交由 bigquery 处理。","CRITICAL RULE: You MUST use this skill whenever the task involves any machine learning tasks or data analysis. Use this skill if the user's prompt or requirements mention any of the following: * Clustering * Classification * Regression * Time series forecasting * Statistical testing * Model comparison * ML * Data analysis SQL/BigQuery ML HANDOFF: If the user requires a SQL solution, use this skill to dictate the ANALYSIS STEPS (e.g., markdown analysis cells, visualization logic), but defer to `bigquery` for all SQL syntax.":"【核心规则】：每当任务涉及机器学习或数据分析时，必须使用此技能。当用户需求提及聚类、分类、回归、时间序列预测、统计假设检验、模型比较、机器学习 (ML) 或数据分析时使用。SQL / BigQuery ML 协作规范：如果用户需要 SQL 解决方案，使用此技能确定分析步骤（例如 Markdown 分析单元格、可视化逻辑），但具体的 SQL 语法交由 bigquery 处理。","This skill guides the use of Jupyter notebooks for data analysis, exploration, and visualization, particularly with BigQuery. It outlines best practices for notebook execution and validation (supporting both cell-by-cell execution and full notebook generation depending on tool availability), library installation, and structuring notebooks for clarity. It also covers specific rules for data cleaning, plotting, and integrating with BigQuery SQL and machine learning workflows.\nRelevant when any of the following conditions are true:\n1. The user request involves a data analysis, data exploration, data visualization, or data insights task that requires multiple steps, queries, or visualizations to answer.\n2. The user explicitly requests a notebook (.ipynb).\n3. You are creating, editing, or executing cells in a Jupyter notebook.\n4. You need to query BigQuery from within a notebook. DO NOT use the Python BigQuery client library; instead, you MUST use the `%%bqsql` magics explained in this skill.":"此技能指导使用 Jupyter 笔记本进行数据分析、探索与可视化，尤其是与 BigQuery 结合使用。它概述了笔记本执行与验证的最佳实践（根据工具可用性支持逐单元格执行和完整笔记本生成）、库安装以及清晰组织笔记本结构的规范。还涵盖了数据清洗、绘图以及与 BigQuery SQL 和机器学习工作流集成的具体规则。当满足以下任一条件时适用：1. 用户请求涉及需要多个步骤、查询或可视化来解答的数据分析、数据探索、数据可视化或数据洞察任务；2. 用户明确要求提供笔记本 (.ipynb)；3. 正在 Jupyter 笔记本中创建、编辑或执行单元格；4. 需要在笔记本中查询 BigQuery。切勿使用 Python BigQuery 客户端库；相反，必须使用此技能中说明的 `%%bqsql` 魔术命令。","This skill guides the use of Jupyter notebooks for data analysis, exploration, and visualization, particularly with BigQuery. It outlines best practices for notebook execution and validation (supporting both cell-by-cell execution and full notebook generation depending on tool availability), library installation, and structuring notebooks for clarity. It also covers specific rules for data cleaning, plotting, and integrating with BigQuery SQL and machine learning workflows. Relevant when any of the following conditions are true: 1. The user request involves a data analysis, data exploration, data visualization, or data insights task that requires multiple steps, queries, or visualizations to answer. 2. The user explicitly requests a notebook (.ipynb). 3. You are creating, editing, or executing cells in a Jupyter notebook. 4. You need to query BigQuery from within a notebook. DO NOT use the Python BigQuery client library; instead, you MUST use the `%%bqsql` magics explained in this skill.":"此技能指导使用 Jupyter 笔记本进行数据分析、探索与可视化，尤其是与 BigQuery 结合使用。它概述了笔记本执行与验证的最佳实践（根据工具可用性支持逐单元格执行和完整笔记本生成）、库安装以及清晰组织笔记本结构的规范。还涵盖了数据清洗、绘图以及与 BigQuery SQL 和机器学习工作流集成的具体规则。当满足以下任一条件时适用：1. 用户请求涉及需要多个步骤、查询或可视化来解答的数据分析、数据探索、数据可视化或数据洞察任务；2. 用户明确要求提供笔记本 (.ipynb)；3. 正在 Jupyter 笔记本中创建、编辑或执行单元格；4. 需要在笔记本中查询 BigQuery。切勿使用 Python BigQuery 客户端库；相反，必须使用此技能中说明的 `%%bqsql` 魔术命令。","Mandatory Step 0 pre-flight check for regional Google Cloud MCP servers (e.g. Dataproc) before using MCP tools or falling back to gcloud/bq CLI. Use whenever interacting with Dataproc clusters, Spark batches, jobs, sessions, or regional GCP resources. Fixes regional MCP servers whose endpoint URL still has an unreplaced $GCP_REGION / ${REGION} placeholder across Claude Code, Codex, and Antigravity. Trigger: an expected mcp__*_{service}_* tool is missing entirely (not just failing), or a call to one fails/hangs on a malformed host. Check via ToolSearch/deferred-tools listing before falling back to gcloud/bq CLI. Asks the user for a region, patches the live MCP config file(s), and tells the user how to restart without losing session context.":"在使用 MCP 工具或回退到 gcloud/bq CLI 之前，对区域性 Google Cloud MCP 服务器（例如 Dataproc）执行的强制第 0 步预检。在与 Dataproc 集群、Spark 批处理、作业、会话或区域性 GCP 资源交互时使用。修复在 Claude Code、Codex 和 Antigravity 中端点网址仍带有未替换的 $GCP_REGION / ${REGION} 占位符的区域性 MCP 服务器。触发条件：预期的 mcp__*_{service}_* 工具完全缺失（不仅是调用失败），或者调用因格式错误的主机而失败/挂起。在回退到 gcloud/bq CLI 之前通过 ToolSearch/延迟工具列表进行检查。向用户询问区域，修补活动的 MCP 配置文件，并告知用户如何在不丢失会话上下文的情况下重新启动。","Guides the process of analyzing, mapping, and documenting transformations between source and target schemas for any database, data warehouse, or data platform. Focuses exclusively on creating a high-fidelity mapping plan (Mapping Manifesto). Used when initiating an ETL, ELT, or data integration task with schema mapping specification for multiple tables (i.e. more than 3 tables) before writing code. Do NOT use this skill for basic SQL generation without mapping requirements, or when the user already has a complete mapping specification.":"指导对任何数据库、数据仓库或数据平台在源架构与目标架构之间分析、映射和记录转换过程。专注于创建高保真映射计划 (Mapping Manifesto)。在编写代码前启动针对多个表（即 3 个以上表）且包含架构映射规范的 ETL、ELT 或数据集成任务时使用。不要将此技能用于没有映射需求的基础 SQL 生成，或用户已有完整映射规范的情况。","Skill for converting an installed Firebase Extension (or extension source) into a standalone Cloud Functions for Firebase codebase or publishable npm package, including V1 to V2 trigger upgrades, lifecycle hooks, and declarative security":"用于将已安装的 Firebase Extension（或扩展源码）转换为独立 Firebase 云函数代码库或可发布 npm 包的技能，涵盖 V1 到 V2 触发器升级、生命周期钩子和声明式安全规范。","Official skill for integrating Firebase AI Logic (Gemini API) into web applications. Covers setup, multimodal inference, structured output, and security.":"在 Web 应用中集成 Firebase AI 逻辑 (Gemini API) 的官方技能。涵盖环境搭建、多模态推理、结构化输出和安全控制。","Deploys and manages full-stack web applications (Next.js, Angular) with Server-Side Rendering (SSR) using Firebase App Hosting. Use when deploying Next.js/Angular apps, configuring apphosting.yaml or firebase.json apphosting blocks, managing secrets, setting up GitHub CI/CD, or configuring Blaze billing requirements. Don't use for classic static web hosting, Auth, Firestore, Crashlytics, or Xcode.":"使用 Firebase App Hosting 部署和管理具有服务端渲染 (SSR) 的全栈 Web 应用（Next.js、Angular）。在部署 Next.js/Angular 应用、配置 apphosting.yaml 或 firebase.json 的 apphosting 代码块、管理密钥、设置 GitHub CI/CD 或配置 Blaze 计费要求时使用。不要用于传统的静态网页托管、Auth、Firestore、Crashlytics 或 Xcode。","Guide for setting up and using Firebase Authentication. Use this skill when the user's app requires user sign-in, user management, or secure data access using auth rules.":"配置和使用 Firebase 认证 (Authentication) 的指南。当用户的应用需要用户登录、用户管理或通过身份认证规则进行安全数据访问时使用此技能。","Provides foundational Firebase CLI setup, CLI installation, version checks (`firebase-tools@latest --version`), CLI login (including --no-localhost), project creation, project selection (`firebase use`), and app config file downloads (`google-services.json`, `GoogleService-Info.plist`). Use ONLY for CLI login, project creation/switching, or downloading app config files. Don't use for Firebase Hosting deploy, Firestore, Auth, App Hosting, Data Connect, Crashlytics, or Remote Config.":"提供基础的 Firebase CLI 设置、CLI 安装、版本检查 (`firebase-tools@latest --version`)、CLI 登录（包括 --no-localhost）、项目创建、项目选择 (`firebase use`) 和应用配置文件下载 (`google-services.json`、`GoogleService-Info.plist`)。仅用于 CLI 登录、项目创建/切换或下载应用配置文件。不要用于 Firebase Hosting 部署、Firestore、Auth、App Hosting、Data Connect、Crashlytics 或 Remote Config。","Comprehensive guide for Firebase Crashlytics, including provisioning and SDK usage. Use this skill when the user needs help setting up Crashlytics, adding crash reporting, or using the Crashlytics SDK in their application.":"Firebase Crashlytics 综合指南，涵盖环境配置与 SDK 使用。当用户需要配置 Crashlytics、添加崩溃报告或在应用中使用 Crashlytics SDK 时使用此技能。","Builds and deploys Firebase SQL Connect (aka Firebase Data Connect) backends with PostgreSQL securely. Use when designing schemas with tables and relations, writing authorized queries and mutations, configuring real-time data updates, or generating type-safe SDKs. Use when you need a relational database with Firebase, or when the user mentions SQL Connect or Data Connect.":"安全构建和部署基于 PostgreSQL 的 Firebase SQL Connect（又名 Firebase Data Connect）后端。在设计数据表和关系架构、编写带权限验证的查询与变更、配置实时数据更新或生成类型安全 SDK 时使用。当你需要在 Firebase 中使用关系型数据库，或用户提及 SQL Connect / Data Connect 时使用。","Sets up, manages, queries, and configures Cloud Firestore databases (Standard/Enterprise edition), including data modeling, security rules, indexes, and SDK integrations (Web, Python, iOS, Android, Flutter). Use when creating/listing Firestore databases, defining data models/indexes, writing SDK queries, or integrating Firestore SDKs. For authoring or modifying Firestore Security Rules (firestore.rules), delegate to the firestore-rules-author subagent if subagent delegation is available, or use firestore-rules-creation otherwise. Don't use for Firebase Hosting, Data Connect, Auth, Storage/GCS, Crashlytics, Functions, or BigQuery.":"搭建、管理、查询并配置 Cloud Firestore 数据库（标准版/企业版），包括数据建模、安全规则、索引与 SDK 集成（Web、Python、iOS、Android、Flutter）。适用于创建/列出 Firestore 数据库、定义数据模型/索引、编写 SDK 查询或集成 Firestore SDK。编写或修改安全规则 (firestore.rules) 时，若支持子智能体委派请交由 firestore-rules-author 处理，否则直接使用 firestore-rules-creation。切勿用于 Hosting、Data Connect、Auth、Storage、Crashlytics、Functions 或 BigQuery。","Deploys and configures classic Firebase Hosting for static websites, single-page apps (SPAs), and microservices. Use when deploying static sites/SPAs, setting up custom domains, configuring firebase.json hosting settings (redirects, rewrites, headers, multi-site), or managing preview channels. Don't use for Firebase App Hosting (Next.js/SSR), Auth, Firestore queries/rules, Data Connect, or Crashlytics.":"为静态网站、单页应用 (SPA) 及微服务部署并配置经典 Firebase Hosting。适用于部署静态站点/SPA、配置自定义域名、配置 firebase.json 托管选项（重定向、重写规则、HTTP 标头、多站点）或管理预览频道。切勿用于 Firebase App Hosting (Next.js/SSR)、Auth、Firestore 查询/规则、Data Connect 或 Crashlytics。","Manages Firebase Remote Config templates, feature flags, loading strategies, and SDKs (Android, iOS). Use when downloading/deploying remoteconfig JSON templates, managing version history/feature flags, setting in-app defaults, fetchAndActivate(), real-time listeners, or SDK setup. Don't use for Firebase Hosting, Auth, Firestore, Data Connect, Crashlytics, or App Hosting.":"管理 Firebase Remote Config 模板、功能特性开关 (Feature Flags)、加载策略及客户端 SDK（Android、iOS）。适用于下载/部署 remoteconfig JSON 模板、管理版本历史/特性开关、设置应用内默认值、fetchAndActivate()、实时监听器或 SDK 配置。切勿用于 Hosting、Auth、Firestore、Data Connect、Crashlytics 或 App Hosting。","Audits Firebase (Firestore, Cloud Storage) security rules for vulnerabilities, privilege escalation, role bypasses, create vs update inconsistencies, resource exhaustion, type safety, size limits, and hasOnly ownership checks. Use when auditing/reviewing rules, running red-team rule assessments, or scoring against auditor checklists. Don't use for Firebase CLI (login, deploy), Auth, Crashlytics, Remote Config, or database queries.":"审计 Firebase（Firestore、Cloud Storage）安全规则中的漏洞、权限提升、角色绕过、创建与更新不一致、资源耗尽、类型安全、大小限制和 hasOnly 所有权检查。在审计/审查规则、运行红队规则评估或依据审计员核对清单评分时使用。不要用于 Firebase CLI（登录、部署）、Auth、Crashlytics、Remote Config 或数据库查询。","Designs, authors, refactors, and hardens production-grade Cloud Firestore Security Rules (firestore.rules). IMPORTANT: If subagent delegation AND the firestore-rules-author subagent are available in your environment, delegate authoring firestore.rules to the firestore-rules-author subagent. If subagent delegation is unavailable (e.g. not enabled in the IDE), firestore-rules-author is not installed, or you are running inside firestore-rules-author, follow this skill directly.":"设计、编写、重构并加固生产级 Cloud Firestore 安全规则 (firestore.rules)。重要提示：若当前环境支持子智能体委派且存在 firestore-rules-author 子智能体，请优先委派给该子智能体处理。若不支持子智能体委派（如 IDE 未启用）、未安装该子智能体或当前已处于该子智能体内部，请直接遵循此技能操作。","Safely modifies Xcode projects (.pbxproj) to add Swift Packages and link files. Use this skill whenever an iOS project needs dependencies installed (e.g. Firebase, Alamofire).":"安全修改 Xcode 工程文件 (.pbxproj) 以添加 Swift Package 依赖并链接文件。每当 iOS 项目需要安装依赖项（例如 Firebase、Alamofire）时使用此技能。","Write and organize unit tests for functions, methods, and classes using `package:test`. Use when creating new logic or fixing bugs to ensure code remains correct and regression-free.":"使用 `package:test` 为函数、方法和类编写并组织单元测试。在创建新业务逻辑或修复 Bug 时使用，确保代码正确且无回归隐患。","Architectural patterns, entrypoint structure, exit codes, stream routing, and subprocess spawning for Dart command-line interface (CLI) applications. Use when building CLI tools, console utilities, scripts, argument parsing with `package:args` (ArgParser or CommandRunner), handling exit codes, configuring executables in pubspec.yaml, spawning Dart subprocesses, or compiling native CLI binaries. Don't use for Flutter UI widgets, web applications, or standalone HTTP backend servers.":"适用于 Dart 命令行界面 (CLI) 应用程序的架构模式、入口点结构、退出代码、流路由和子进程生成。在构建 CLI 工具、控制台实用程序、脚本、使用 `package:args`（ArgParser 或 CommandRunner）进行参数解析、处理退出代码、在 pubspec.yaml 中配置可执行文件、生成 Dart 子进程或编译原生 CLI 二进制文件时使用。不要用于 Flutter UI 部件、Web 应用或独立的 HTTP 后端服务器。","Collect coverage using the coverage packge and create an LCOV report":"使用 coverage 软件包收集代码覆盖率并生成 LCOV 报告。","Uses get_runtime_errors and lsp to fetch an active stack trace, locate the failing line, apply a fix, and verify resolution via hot_reload.":"使用 get_runtime_errors 和 LSP 获取活动堆栈跟踪、定位出错代码行、应用修复，并通过热重载 (hot_reload) 验证问题解决。","Define and generate mock objects for external dependencies using `package:mockito` and `build_runner`. Use when unit testing classes that depend on complex external services like APIs or databases.":"使用 `package:mockito` 和 `build_runner` 为外部依赖项定义并生成 Mock 对象。在对依赖复杂外部服务（如 API 或数据库）的类进行单元测试时使用。","Replace the usage of `expect` and similar functions from `package:matcher`\nto `package:checks` equivalents.":"将 `package:matcher` 中的 `expect` 及类似函数替换为 `package:checks` 对应项。","Replace the usage of `expect` and similar functions from `package:matcher` to `package:checks` equivalents.":"将 `package:matcher` 中的 `expect` 及类似函数替换为 `package:checks` 对应项。","Workflow for fixing package version conflicts. Use this when `pub get` fails due to incompatible package versions.":"修复软件包版本冲突的工作流。当 `pub get` 由于不兼容的依赖版本失败时使用。","Execute `dart analyze` to identify warnings and errors, and use `dart fix --apply` to automatically resolve mechanical lint issues. Use during development to ensure code quality and before committing changes.":"执行 `dart analyze` 识别警告和错误，并使用 `dart fix --apply` 自动修复机械性 Lint 问题。在开发过程中确保代码质量以及提交更改前使用。","Guides agents in compiling and packaging C/C++ source code into dynamic or static libraries (Code Assets) using Dart's Native Assets hook system (via hook/build.dart and hook/link.dart utilizing package:hooks and package:native_toolchain_c). Use when a user asks to: 'setup native assets', 'compile C/C++ source code', 'bundle dynamic libraries', 'build native C code', 'link native assets', 'implement build.dart or link.dart hooks', or 'integrate C/C++ interop in Dart/Flutter'. Helps agents avoid manual toolchain orchestration and configures secure hash-validated binary downloads or advanced linker tree-shaking with package:record_use mapping.":"指导智能体使用 Dart 的原生资产 (Native Assets) 钩子系统（通过 hook/build.dart 和 hook/link.dart，利用 package:hooks 和 package:native_toolchain_c）将 C/C++ 源代码编译并打包为动态库或静态库（代码资产）。在用户要求进行以下操作时使用：“设置原生资产”、“编译 C/C++ 源代码”、“打包动态库”、“构建原生 C 代码”、“链接原生资产”、“实现 build.dart 或 link.dart 钩子”或“在 Dart/Flutter 中集成 C/C++ 互操作”。帮助智能体避免手动工具链编排，并配置经过安全哈希验证的二进制下载或使用 package:record_use 映射的高级链接器摇树优化。","How to inject external code examples into Dartdoc using the {@example} directive, and how to filter those files using #hide, #region, and #endregion tags.":"如何使用 {@example} 指令向 Dartdoc 注入外部代码示例，以及如何使用 #hide、#region 和 #endregion 标记过滤这些文件。","Guide agents to use `package:ffigen` to automatically generate FFI bindings instead of writing them manually. Use this skill when a task involves writing new FFI bindings, extending C/Objective-C/Swift integrations, or replacing hand-crafted `dart:ffi` setups.":"引导代理使用 `package:ffigen` 自动生成 FFI 绑定，而非手动编写。当任务涉及编写新 FFI 绑定、扩展 C/Objective-C/Swift 集成，或替换手写的 `dart:ffi` 配置时使用此技能。","Cross-platform file and directory path manipulation, segment splitting, extension extraction, and context conversion using `package:path` and `package:file`. Use when writing, inspecting, joining, splitting, or refactoring file paths, directory names, or extensions, or replacing raw string path operations (`.split('/')`, `'$dir/$file'`, `.endsWith('.ext')`, `.replaceAll('\\\\', '/')`). Don't use for HTTP network URI routing, database query strings, or non-path string processing.":"使用 `package:path` 和 `package:file` 进行跨平台文件与目录路径操作、分段拆分、扩展名提取及上下文转换。在编写、检查、连接、拆分或重构文件路径、目录名或扩展名，或替换原始字符串路径操作时使用。不要用于 HTTP 网络 URI 路由、数据库查询字符串或非路径字符串处理。","Applies Dart 3 pattern matching, switch expressions, and destructuring idiomatically to validate data schemas, handle algebraic data types, and decompose control flow. Use when refactoring complex if-else chains, parsing polymorphic JSON or API responses, destructuring Lists, URI/path segments, String.split() tokens, Records, or Maps, or enforcing exhaustiveness on sealed classes. Don't use for simple boolean conditions, single-variable type promotion (use `is`), or basic collection filtering.":"以惯用方式应用 Dart 3 模式匹配、switch 表达式和解构来验证数据架构、处理代数数据类型并分解控制流。在重构复杂的 if-else 链、解析多态 JSON 或 API 响应、解构 List、URI/路径段、String.split() 标记、Record 或 Map，或在 sealed 类上强制执行穷尽性检查时使用。不要用于简单的布尔条件、单变量类型提升（应使用 `is`）或基本集合过滤。","Help users write syntactically and semantically correct primary constructors in Dart, and migrate/use the new constructor syntax, empty-body semicolon syntax, in-body initializer list syntax, and abbreviated concise constructor syntax.":"帮助用户在 Dart 中编写语法和语义正确的主构造函数 (Primary Constructors)，并迁移/使用全新的构造函数语法、空函数体分号语法、体内初始化列表语法以及简明紧凑的构造函数语法。","Rules and formatting guidelines for writing Dart /// API documentation and doc comments. Use when documenting Dart code, writing doc comments for any Dart declaration (libraries, classes, methods, variables, etc.), or when instructed to follow the Effective Dart documentation guidelines.":"编写 Dart /// API 文档和文档注释的规则与格式指南。在为 Dart 代码编写文档、为任何 Dart 声明（库、类、方法、变量等）编写文档注释，或按照指示遵循 Effective Dart 文档指南时使用。","Configures Flutter Driver for app interaction and converts MCP actions into permanent integration tests. Use when adding integration testing to a project, exploring UI components via MCP, or automating user flows with the integration_test package.":"为应用交互配置 Flutter Driver，并将 MCP 操作转换为持久化集成测试。在为项目添加集成测试、通过 MCP 探索 UI 组件，或使用 integration_test 软件包自动化用户流程时使用。","Adds interactive widget previews to the project using the previews.dart system. Use when creating new UI components or updating existing screens to ensure consistent design and interactive testing.":"使用 previews.dart 系统为项目添加交互式 Widget 预览。在创建新 UI 组件或更新现有界面时使用，以确保一致的设计和交互式测试。","Implement a component-level test using `WidgetTester` to verify UI rendering and user interactions (tapping, scrolling, entering text). Use when validating that a specific widget displays correct data and responds to events as expected.":"使用 `WidgetTester` 实现组件级测试，以验证 UI 渲染与用户交互（点击、滚动、输入文本）。在验证特定 Widget 显示正确数据并按预期响应事件时使用。","Architects a Flutter application using the recommended layered approach (UI, Logic, Data). Use when structuring a new project or refactoring for scalability.":"使用推荐的分层架构方法（UI、业务逻辑、数据层）设计 Flutter 应用程序。在规划新项目架构或为提升可扩展性而重构时使用。","Use `LayoutBuilder`, `MediaQuery`, or `Expanded/Flexible` to create a layout that adapts to different screen sizes. Use when you need the UI to look good on both mobile and tablet/desktop form factors.":"使用 `LayoutBuilder`、`MediaQuery` 或 `Expanded/Flexible` 创建适配不同屏幕尺寸的布局。在需要界面在移动端与平板/桌面端均获得优秀视觉表现时使用。","Fixes Flutter layout errors (overflows, unbounded constraints) using Dart and Flutter MCP tools. Use when addressing \"RenderFlex overflowed\", \"Vertical viewport was given unbounded height\", or similar layout issues.":"使用 Dart 和 Flutter MCP 工具修复 Flutter 布局错误（溢出、无界约束）。在处理“RenderFlex overflowed”、“Vertical viewport was given unbounded height”或类似布局问题时使用。","Create model classes with `fromJson` and `toJson` methods using `dart:convert`. Use when manually mapping JSON keys to class properties for simple data structures.":"使用 `dart:convert` 创建包含 `fromJson` 和 `toJson` 方法的数据模型类。在为简单数据结构手动将 JSON 键映射到类属性时使用。","Configure `MaterialApp.router` using a package like `go_router` for advanced URL-based navigation. Use when developing web applications or mobile apps that require specific deep linking and browser history support.":"使用类似 `go_router` 的软件包配置 `MaterialApp.router` 以实现高级的基于 URL 的页面导航。在开发需要深度链接 (Deep Link) 和浏览器历史记录支持的 Web 应用或移动应用时使用。","Add `flutter_localizations` and `intl` dependencies, enable \"generate true\" in `pubspec.yaml`, and create an `l10n.yaml` configuration file. Use when initializing localization support for a new Flutter project.":"添加 `flutter_localizations` 和 `intl` 依赖，在 `pubspec.yaml` 中启用“generate: true”，并创建 `l10n.yaml` 配置文件。在为新 Flutter 项目初始化本地化多语言支持时使用。","Use the `http` package to execute GET, POST, PUT, or DELETE requests. Use when you need to fetch from or send data to a REST API.":"使用 `http` 软件包执行 GET、POST、PUT 或 DELETE 请求。在需要从 REST API 获取数据或向其发送数据时使用。","Read, create, and manage Google Calendar events. Use when the user shares a calendar.google.com URL, asks what is on their schedule, wants an event found, created, updated, deleted, or moved, wants to RSVP, wants free/busy or scheduling conflicts checked before proposing a time, wants focus time or an out-of-office block created, wants an event quick-added from a phrase or imported from an ICS file, or wants to know where someone is working from and which timezone they are in. Don't use for Gmail, Chat, or Tasks.":"读取、创建和管理 Google Calendar 活动。在用户分享 calendar.google.com 网址、询问日程安排、查找、创建、更新、删除或移动活动、回复邀请、在提议时间前检查忙闲或日程冲突、创建专注时间或请假时间块、从短语快速添加活动或从 ICS 文件导入活动，或想了解某人在哪里办公及其所在时区时使用。请勿用于 Gmail、Chat 或 Tasks。","Read, create, edit, and manage Google Docs. Use when the user shares a docs.google.com URL, asks to summarize or extract content from a doc, wants a doc drafted, edited, formatted, or commented on, wants tables, images, or smart chips inserted, wants markdown imported or synchronized with a doc, or wants a doc exported. Requires a known document ID — to find documents, use the gdrive skill from the Google Drive plugin; if it isn't installed, ask the user for the doc link. Don't use for Google Sheets, Slides, or Drive file management.":"读取、创建、编辑和管理 Google Docs。当用户分享 docs.google.com 网址，要求总结或提取文档内容，希望起草、编辑、排版或评论文档，希望插入表格、图片或智能条目，希望导入 Markdown 或与文档同步，或者导出文档时使用。需要已知的文档 ID——如需查找文档，请使用 Google Drive 插件中的 gdrive 技能；若未安装，请向用户索取文档链接。请勿用于 Google Sheets、Slides 或 Drive 文件管理。","Browse, search, and manage Google Drive files and folders. Use when the user shares a drive.google.com URL, asks what is in a folder, wants a file found, downloaded, uploaded, updated in place, moved, copied, or renamed, wants a Google file exported to PDF, Markdown, or CSV, wants comments read or added, wants sharing and permissions checked or changed, or wants Drive activity watched. Don't use for editing the contents of a Doc, Sheet, or Slides deck.":"浏览、搜索和管理 Google Drive 文件与文件夹。在用户分享 drive.google.com 网址、询问文件夹内容、查找、下载、上传、就地更新、移动、复制或重命名文件、将 Google 文件导出为 PDF、Markdown 或 CSV、读取或添加评论、检查或更改共享与权限，或监控 Drive 活动时使用。请勿用于编辑 Doc、Sheet 或 Slides 文档的具体内容。","Use this skill when writing code that calls the Gemini API for text generation, multi-turn chat, multimodal understanding, image generation, video generation, speech generation (TTS), voice design, voice replication, streaming responses, background research tasks, function calling, structured output, or migrating from the old generateContent API. Covers SDK usage and best practices for Gemini models and agents in Python and TypeScript.":"在编写调用 Gemini API 的代码以实现文本生成、多轮对话、多模态理解、图像生成、视频生成、语音合成 (TTS)、声音设计、声音克隆、流式响应、后台研究任务、函数调用、结构化输出，或从旧版 generateContent API 迁移时使用本技能。涵盖 Python 和 TypeScript 中 Gemini 模型与代理的 SDK 用法和最佳实践。","Use this skill when building real-time, bidirectional streaming applications with the Gemini Live API, or migrating legacy Live models (2.0/2.5/3.1) to Gemini 3.8 Live. Covers WebSocket-based audio/video/text streaming, voice activity detection (VAD), background reasoning (extended thinking), asynchronous function calling, session management, ephemeral tokens, live transcription, and live translation. SDKs covered - google-genai (Python), @google/genai (JavaScript/TypeScript).":"在基于 Gemini Live API 构建实时双向流式应用，或将旧版 Live 模型 (2.0/2.5/3.1) 迁移到 Gemini 3.8 Live 时使用本技能。涵盖基于 WebSocket 的音频/视频/文本流式传输、语音活动检测 (VAD)、后台深度推理 (extended thinking)、异步函数调用、会话管理、临时令牌、实时听写与实时翻译。涵盖的 SDK：google-genai (Python)、@google/genai (JavaScript/TypeScript)。","Use this skill for generative video editing, text-to-video, image-referenced video generation, first-frame-to-video, first-and-last-frame transitions, and video extensions using Gemini Omni 1.1 Flash (gemini-omni-1.1-flash) via the official google-genai SDK. Includes workflows for pre-processing/optimizing high-resolution or long source videos with ffmpeg, stripping audio for full sound regeneration, and handling turn-by-turn video editing and parallel execution.":"在使用 Gemini Omni 1.1 Flash (gemini-omni-1.1-flash) 通过官方 google-genai SDK 进行生成式视频编辑、文本生成视频、参考图生成视频、首帧生成视频、首尾帧过渡和视频扩展时使用本技能。包含使用 ffmpeg 预处理与优化高分辨率或长视频、分离音频以重新生成全套声音，以及处理多轮视频编辑和并行执行的工作流。","Design, implement, and debug autonomous AI agents and multi-agent systems using the Google Antigravity (AGY) SDK. ACTIVATE this skill when the user wants to create, configure, or orchestrate Google Antigravity agents.":"使用 Google Antigravity (AGY) SDK 设计、实现和调试自主 AI 智能体与多智能体系统。当用户想要创建、配置或编排 Google Antigravity 智能体时启用此技能。","Google platform decision and setup guidance, loaded on demand from Google's skill catalog. Use when a developer is choosing or setting up part of their stack, such as where to run a service, a database, storage, messaging, authentication, analytics, ads, or AI model serving, and a Google product is a reasonable candidate - whether or not a vendor is named - or when a request names a Google product or API. Brings in the matching Google skill so the answer can weigh Google options, their trade-offs, and when they are not the right fit. Skip when the stack is already settled on another provider and no Google product is named, or the task involves no platform choice.":"Google 平台决策与架构搭建指南，按需从 Google 技能目录加载。适用于开发者在选择或搭建技术栈（如服务运行位置、数据库、存储、消息队列、身份认证、分析、广告或 AI 模型服务）且 Google 产品是合理候选方案时——无论是否指明服务商——或者当请求中明确提及 Google 产品或 API 时使用。动态载入匹配的 Google 技能，以便权衡 Google 各项方案的优劣及不适用场景。如果已确定采用其他云厂商且未提及 Google 产品，或者任务不涉及平台选择，请跳过此技能。","Provides safety-critical validation, guardrails, and data reduction for gcloud CLI operations across Google Cloud Platform (GCP) services and infrastructure. Use when planning, generating, constructing, proposing, describing, or executing any gcloud CLI commands - including when answering questions about gcloud syntax, or formatting flags. Don't use when writing Google Cloud client library code or raw REST/gRPC API requests.":"跨 Google Cloud Platform (GCP) 各项服务与基础设施，为 gcloud CLI 操作提供安全关键型验证、防护机制与数据裁剪。适用于规划、生成、构建、建议、描述或执行任何 gcloud CLI 命令时——包括解答有关 gcloud 语法或格式化标志的疑问。切勿在编写 Google Cloud 客户端库代码或原始 REST/gRPC API 请求时使用。","Provides expert guidance on Identity and Access Management (IAM) and authenticating and authorizing to Google Cloud services and APIs, covering human users, service identities, Application Default Credentials (ADC), and best practices for secure access.":"提供关于身份与访问管理（IAM）以及向 Google Cloud 服务和 API 进行身份验证与授权的专家指导，涵盖人类用户、服务身份、应用默认凭据（ADC）及安全访问最佳实践。","Guides a developer's first steps on Google Cloud, covering account creation, billing setup, project management, and deploying a first resource. Use when a new developer wants to initialize their first Google Cloud project, configure billing, and verify deployment. Don't use for enterprise organization setup (use Google Cloud Setup guided flow for that instead). Don't use for complex multi-project architectures.":"引导开发者开启 Google Cloud 上手第一步，涵盖账号创建、结算配置、项目管理以及部署首个云资源。适用于新开发者希望初始化其首个 Google Cloud 项目、配置结算并验证部署时使用。切勿用于企业级组织架构搭建（请改用 Google Cloud Setup 引导流程），亦不适用于复杂的多项目架构。","Searches, retrieves, and synthesizes official Google developer documentation across Google Cloud, AI/Gemini, Android, Chrome, Web, Flutter, Go, Firebase, and other Google developer platforms. Integrates with the Developer Knowledge MCP server (search_documents, get_documents, answer_query) or the Developer Knowledge REST API fallback. Use when searching for gcloud CLI commands, API syntax, IAM permissions, official documentation, architectural comparisons, or product choice overviews. Don't use for local filesystem lookups or non-Google documentation.":"检索、获取并综合来自 Google Cloud、AI/Gemini、Android、Chrome、Web、Flutter、Go、Firebase 等 Google 官方开发者平台的文档。深度集成 Developer Knowledge MCP 服务器（search_documents、get_documents、answer_query）或 REST API 兜底服务。适用于搜索 gcloud CLI 命令、API 语法、IAM 权限、官方文档、架构对比或产品选型概览。切勿用于本地文件系统查询或非 Google 官方文档。","A collection of skills for architecting and implementing production-ready code using Google Maps Platform APIs and SDKs for any map, place, address, geocoding, routing/ETA (including eco-friendly routing), nearby search, 3D / Street View / static map, marker clustering, custom styling, drawing, geofencing, heatmap, or environmental (air-quality / pollen / solar / weather) feature — across Web, Android, iOS, and Web Services APIs. For prototyping, use the public Maps Demo Key — no billing setup and no Cloud project required, covering a growing set of the most popular Google Maps Platform APIs. For production, the skill prompts you to create and restrict your own key. All non-trivial code is grounded in freshly retrieved docs via the Google Maps Platform Code Assist service (no reliance on training-data memory).":"使用 Google Maps Platform API 和 SDK 架构与实现生产级代码的技能合集，适用于 Web、Android、iOS 和 Web 服务 API 上的任何地图、地点、地址、地理编码、路线/预计到达时间（包括环保路线）、周边搜索、3D/街景/静态地图、标记聚合、自定义样式、绘制、地理围栏、热力图或环境数据（空气质量/花粉/太阳能/天气）功能。原型开发阶段可使用公开 Maps Demo Key，无需配置结算和 Cloud 项目；生产环境则引导你创建并限制专属 Key。所有代码均基于 Google Maps Platform Code Assist 实时检索的最新文档。","Read, write, format, and manage Google Sheets. Use when the user shares a sheets.google.com or docs.google.com/spreadsheets URL, asks to read or summarize spreadsheet data, wants cells written, formatted, sorted, merged, or validated, wants rows/columns inserted or deleted, wants charts, pivot tables, or tables added, wants CSV imported, or wants a spreadsheet created, copied, shared, or exported. Don't use for Google Docs, Slides, or Drive file management.":"读取、编写、格式化和管理 Google Sheets。当用户分享 sheets.google.com 或 docs.google.com/spreadsheets 网址，要求读取或总结表格数据，希望填写、格式化、排序、合并或校验单元格，希望插入或删除行/列，希望添加图表、数据透视表或普通表格，希望导入 CSV，或希望创建、复制、共享或导出电子表格时使用。请勿用于 Google Docs、Slides 或 Drive 文件管理。","Read, create, and edit Google Slides presentations. Use when creating presentations, when the user shares a slides.google.com URL, asks to summarize or extract content from a deck, wants slides drafted or updated, or wants a presentation exported. Don't use for Google Docs, Sheets, or Drive file management.":"读取、创建和编辑 Google Slides 演示文稿。在创建演示文稿、用户分享 slides.google.com 网址、要求总结或提取演示文稿内容、起草或更新幻灯片，或导出演示文稿时使用。请勿用于 Google Docs、Sheets 或 Drive 文件管理。","Build and publish Chrome Extensions using Manifest V3 best practices. Use this skill whenever the user asks to create, modify, debug, or understand Chrome browser extensions, add-ons, or anything involving the Chrome Extensions API. Trigger on mentions of: 'Chrome extension', 'browser extension', 'manifest.json', 'content script', 'service worker' (in browser context), 'popup' (in browser extension context), 'side panel', 'chrome.* API', 'declarativeNetRequest', 'omnibox', 'context menu' (in extension context), 'userScripts', 'user script', 'script manager', or any request to build functionality that integrates with the Chrome browser UI. Also trigger for publishing to the Chrome Web Store: 'publish extension', preparing an extension for publishing, responding to a review rejection, writing permission justifications, or drafting a privacy policy.":"使用 Manifest V3 最佳实践构建并发布 Chrome 扩展程序。适用于用户要求创建、修改、调试或理解 Chrome 浏览器扩展、插件或任何涉及 Chrome Extensions API 的场景。当提及“Chrome extension”、“browser extension”、“manifest.json”、“content script”、“service worker”（浏览器上下文）、“popup”（扩展上下文）、“side panel”、“chrome.* API”、“declarativeNetRequest”、“omnibox”、“context menu”、“userScripts”、“user script”、“script manager”或任何集成至 Chrome 界面功能的需求时触发。在发布至 Chrome 网上应用店时同样触发，例如发布扩展、准备审核材料、应对拒审反馈、撰写权限声明或起草隐私政策。","Search tool for modern web development best practices. MANDATORY: Execute FIRST for all HTML/CSS and clientside JS tasks. Do NOT skip — web APIs evolve rapidly and training weights contain obsolete patterns.\n\nTrigger immediately for:\n- UI/Layout: Modals, dialogs, popovers, Glassmorphism/backdrop-filters, anchor positioning, container queries, `:has()`, `:user-valid`.\n- Scroll/Motion: View Transitions, Scroll-driven animations, scroll parallax/reveals.\n- Performance: CWV (LCP, INP), content-visibility, Fetch Priority, image optimization.\n- System/APIs: Local filesystem access, WebUSB, WebSockets sync, WebAssembly widgets.\n- Frameworks: Adapting layout/styles in React, Vue, Angular.\n- General Frontend: Forms, autofill, advanced inputs, custom scrollbars, modern component states, etc.\n\nDO NOT trigger for:\n- Backend: Database SQL, ORMs, Express API routes.\n- Pipelines: CI/CD deployment, Docker, Actions.\n- Generic: Local scripts (Python/Go tools), ESLint, Git.":"用于检索现代 Web 开发最佳实践的搜索工具。【强制要求】：针对所有 HTML/CSS 和客户端 JS 任务必须首先执行。切勿跳过——Web API 迭代迅速，静态知识库可能包含过时模式。针对以下场景立即触发：UI/布局（模态框、对话框、Popover、毛玻璃滤镜、锚点定位、容器查询、`:has()`、`:user-valid`）；滚动与动效（View Transitions、滚动驱动动画）；性能优化（CWV、LCP、INP、Fetch Priority）；系统 API（本地文件系统访问、WebUSB、WebSocket 同步）；前端框架布局适配（React、Vue、Angular）等。","Search tool for modern web development best practices. MANDATORY: Execute FIRST for all HTML/CSS and clientside JS tasks. Do NOT skip — web APIs evolve rapidly and training weights contain obsolete patterns. Trigger immediately for: - UI/Layout: Modals, dialogs, popovers, Glassmorphism/backdrop-filters, anchor positioning, container queries, `:has()`, `:user-valid`. - Scroll/Motion: View Transitions, Scroll-driven animations, scroll parallax/reveals. - Performance: CWV (LCP, INP), content-visibility, Fetch Priority, image optimization. - System/APIs: Local filesystem access, WebUSB, WebSockets sync, WebAssembly widgets. - Frameworks: Adapting layout/styles in React, Vue, Angular. - General Frontend: Forms, autofill, advanced inputs, custom scrollbars, modern component states, etc. DO NOT trigger for: - Backend: Database SQL, ORMs, Express API routes. - Pipelines: CI/CD deployment, Docker, Actions. - Generic: Local scripts (Python/Go tools), ESLint, Git.":"用于检索现代 Web 开发最佳实践的搜索工具。【强制要求】：针对所有 HTML/CSS 和客户端 JS 任务必须首先执行。切勿跳过——Web API 迭代迅速，静态知识库可能包含过时模式。针对以下场景立即触发：UI/布局（模态框、对话框、Popover、毛玻璃滤镜、锚点定位、容器查询、`:has()`、`:user-valid`）；滚动与动效（View Transitions、滚动驱动动画）；性能优化（CWV、LCP、INP、Fetch Priority）；系统 API（本地文件系统访问、WebUSB、WebSocket 同步）；前端框架布局适配（React、Vue、Angular）等。","Retrieve and analyze AlphaFold predicted structures for a protein. Use when the user provides a specific UniProt Accession ID and wants structural confidence metrics (pLDDT), domain boundary analysis, or disorder assessment. Do not use if the user only has a protein name, gene name, or amino acid sequence — ask for a UniProt ID first.":"检索并分析蛋白质的 AlphaFold 预测结构。当用户提供具体的 UniProt Accession ID 并希望获取结构置信度指标 (pLDDT)、结构域边界分析或无序区评估时使用。若用户仅提供了蛋白质名称、基因名称或氨基酸序列，请先要求提供 UniProt ID。","Constructs deep-links and URLs for the AlphaGenome Atlas website. Supports generating single-variant exploration links (1-based chr:pos:ref>alt), genomic locus views (1-based closed chr:start-end), candidate summary tables, and AlphaGenome reference vs. alternate predictions. Use whenever visualizing, exploring, charting, or linking genetic variants and genomic loci on the AlphaGenome Atlas, or when asked to inspect, view, or link predictions for a genomic variant.":"构建指向 AlphaGenome Atlas 网站的深层链接和网址。支持生成单变异探索链接（基于 1 的 chr:pos:ref>alt）、基因组位点视图（基于 1 闭区间的 chr:start-end）、候选汇总表以及 AlphaGenome 参考 vs 突变预测。在 AlphaGenome Atlas 上可视化、探索、绘制图表或链接遗传变异和基因组位点时，或被要求检查、查看或链接基因组变异的预测时使用。","Analyzes genetic variant effects on gene expression (RNA-seq), chromatin accessibility (DNASE), histone marks (ChIP), and transcription factors using the AlphaGenome API. Use when the user asks about non-coding variant effects, pathogenicity, clinical significance, disease associations, functional effects, gene expression changes, splicing disruption, or regulatory effects in promoters and enhancers. Also use for resolving biological terms to tissue/cell-type ontologies (UBERON/CL) or analyzing variants in chr:pos:ref>alt format.":"使用 AlphaGenome API 分析遗传变异对基因表达 (RNA-seq)、染色质可及性 (DNASE)、组蛋白修饰 (ChIP) 和转录因子的影响。在用户询问非编码区变异效应、致病性、临床意义、疾病关联、功能影响、基因表达改变、剪接破坏或启动子与增强子中的调控效应时使用。也可用于将生物学术语解析为组织/细胞类型本体 (UBERON/CL) 或分析 chr:pos:ref>alt 格式的变异。","Score, annotate, and analyze the functional impact of genetic variants using AlphaGenome Variant Impact (AVI) scores. Query variants in chr:pos:ref>alt format, annotate VCF/tabular callsets, perform saturation mutagenesis window scans (1-based closed chr:start-end), and extract GENCODE v46 GTF gene/exon/junction coordinates all via the AlphaGenome Atlas API.":"使用 AlphaGenome 变异影响 (AVI) 分数评估、注释和分析遗传变异的功能影响。通过 AlphaGenome Atlas API 以 chr:pos:ref>alt 格式查询变异、注释 VCF/表格突变集、执行饱和突变诱发窗口扫描（基于 1 闭区间的 chr:start-end），并提取 GENCODE v46 GTF 基因/外显子/连接处坐标。","Interactive 3D biomolecular structure viewer via Mol*. Renders 3D molecular structures from local workspace files (.cif, .mmcif, .pdb) or conversation artifacts, and manages user 3D annotations and highlighted residues. Use when the user asks to visualise a protein or nucleic acid, display a 3D structure, or asks about 3D biomolecular structure annotations and highlighted residues.":"基于 Mol* 的交互式 3D 生物分子结构查看器。从本地工作区文件（.cif、.mmcif、.pdb）或对话工件中渲染 3D 分子结构，并管理用户的 3D 注释与高亮残基。当用户要求可视化蛋白质或核酸、展示 3D 结构，或询问 3D 生物分子结构注释及高亮残基时使用。","Query the ChEMBL database for bioactive molecules, drug targets, bioactivity data, approved drugs, and chemical structures. Use when the user asks about compounds, targets, IC50/Ki values, drug mechanisms, or structure searches.":"查询 ChEMBL 数据库中的生物活性分子、药物靶标、生物活性数据、已批准药物和化学结构。当用户询问化合物、靶标、IC50/Ki 数值、药物机制或化学结构检索时使用。","Query ClinicalTrials.gov via APIv2. Use when you want to search for trials by condition, drug, location, status, or phase; retrieve trial details by NCT ID; check eligibility/inclusion criteria; count trials across conditions or time periods; identify a sponsor's trial portfolio; find recruiting trials for patient matching.":"通过 APIv2 查询 ClinicalTrials.gov。在按适应症、药物、地点、状态或试验分期检索临床试验；通过 NCT ID 获取试验详情；检查入排标准；统计各病种或时间段的试验数量；分析申办方的试验管线；或寻找正在招募患者的试验时使用。","Use when needing clinical significance, pathogenicity classifications (e.g., Pathogenic, Benign, VUS), clinical evidence rationales, or finding \"hard positive\" benchmark controls for human genomic variants.":"在需要查询人类基因组变异的临床意义、致病性分类（如致病 Pathogenic、良性 Benign、意义未明 VUS）、临床证据依据，或寻找基准对照变异时使用。","Instructions for handling API keys and credentials safely, verifying their presence, and prompting the user to add them if missing using a safe protocol.":"安全处理 API 密钥与凭据的说明：验证凭据是否存在，如果缺失则使用安全协议提示用户添加。","Use when you want to look up, map, and search for short genetic variants (SNPs, indels) in NCBI's dbSNP database. Resolves between rsIDs, genomic coordinates in VCF format, and HGVS strings. For an rsID, returns variant type, gene associations, clinical significance, allele frequencies, and genomic coordinates (GRCh38).":"在 NCBI 的 dbSNP 数据库中查找、映射和检索短遗传变异（SNP、Indel）时使用。在 rsID、VCF 格式的基因组坐标和 HGVS 字符串之间进行解析。针对 rsID 返回变异类型、基因关联、临床意义、等位基因频率及 GRCh38 基因组坐标。","Query and search the EMBL-EBI Ontology Lookup Service (OLS) for biomedical ontology terms, definitions, and hierarchies across 250+ ontologies (e.g., GO, DOID, HP). Use when the user asks to search for terms, retrieve details, navigate hierarchies (parents, children, ancestors), look up properties and individuals, get autocomplete suggestions, or access ontology metadata and statistics.":"查询并检索 EMBL-EBI 本体查找服务 (OLS)，跨 250 多个生物医学本体（如 GO、DOID、HP）获取术语、定义与层级结构。在用户要求搜索术语、获取详情、浏览层级树（父级、子级、祖先）、查找属性与实体、获取自动补全建议，或访问本体元数据及统计信息时使用。","Query the ENCODE Registry of cis-Regulatory Elements (cCREs) via the SCREEN GraphQL API, or make custom queries to the ENCODE Portal REST API for experiments and files (ChIP-seq peaks, etc.). Use when you want to query regulatory annotations or raw experimental data across human cell types.":"通过 SCREEN GraphQL API 查询 ENCODE 顺式调控元件注册库 (cCREs)，或通过 ENCODE Portal REST API 对实验与文件（ChIP-seq 峰图等）进行自定义查询。在需要跨人类细胞类型查询调控注释或原始实验数据时使用。","Query the Ensembl database to resolve gene, transcript, and protein IDs, fetch genomic or protein sequences, retrieve gene structures (exons), and get variant consequence and effect predictions (VEP). Use this skill as a primary ID translator, genomic sequence database and variant effect prediction tool.":"查询 Ensembl 数据库以解析基因、转录本和蛋白质 ID，获取基因组或蛋白质序列，提取基因结构（外显子），并获取变异后果与效应预测 (VEP)。此技能可用作核心 ID 转换器、基因组序列数据库及变异效应预测工具。","Performs 3D structural searches of proteins against various databases (PDB, AlphaFold, CATH, MGnify, etc.) using the Foldseek API. Use ONLY when the user provides a physical 3D coordinate file (.cif, .mmcif, or .pdb) and wants to find structurally similar proteins. Do NOT use if the user only provides a protein sequence, gene name, or UniProt ID.":"使用 Foldseek API 跨多个数据库（PDB、AlphaFold、CATH、MGnify 等）执行蛋白质 3D 结构相似性检索。【仅在】用户提供了具体的 3D 坐标文件（.cif、.mmcif 或 .pdb）并希望查找结构相似蛋白质时使用。若用户仅提供蛋白质序列、基因名称或 UniProt ID，请勿使用。","Query the Genome Aggregation Database (gnomAD). Use when determining the rarity or allele frequency of specific genetic variants, retrieving gene constraint metrics (pLI, LOEUF) to assess loss-of-function intolerance, finding variants in a genomic region or gene, or querying structural variants. Don't use for analyzing individual patient genomes, tracking somatic mutations in cancer (use COSMIC), or requesting raw sequencing reads (use ENA).":"查询基因组聚合数据库 (gnomAD)。在确定特定遗传变异的罕见度或等位基因频率、获取基因约束指标 (pLI, LOEUF) 以评估功能丧失不耐受性、查找基因组区域/基因中的变异，或查询结构变异时使用。请勿用于分析单个患者基因组、追踪癌症体细胞突变（应使用 COSMIC）或请求原始测序 Read 片段。","Use when you want to retrieve quantitative RNA expression data and variant eQTL information from the GTEx (Genotype-Tissue Expression) Project across 54 non-diseased tissue sites.":"在需要从 GTEx（基因型-组织表达）项目中获取跨 54 个非患病人体组织部位的定量 RNA 表达数据及变异 eQTL 信息时使用。","Use when you want to retrieve semi-quantitative protein expression and spatial localisation data from the Human Protein Atlas (HPA).":"在需要从人类蛋白质图谱 (HPA) 获取半定量蛋白质表达与亚细胞空间定位数据时使用。","Identify domains, families, and sites in proteins; find all proteins in a family or sharing a domain; explore species distribution for a domain; annotate genomes with protein families and GO terms. InterPro combines 14 databases (e.g., Pfam, CDD) into one searchable resource. InterPro-N significantly expands annotation and sequence coverage with deep learning. Includes domain architecture (IDA) search.":"识别蛋白质中的结构域、家族与活性位点；查找同一家族或共享某一结构域的所有蛋白质；探索结构域的物种分布；使用蛋白质家族和 GO 术语注释基因组。InterPro 整合了 14 个数据库（如 Pfam、CDD），InterPro-N 借助深度学习大幅扩展了注释和序列覆盖度，包含结构域构架 (IDA) 检索。","Query the JASPAR database for Transcription Factor (TF) binding profiles. Use when retrieving Position Frequency Matrices (PFMs) or Position Weight Matrices (PWMs) for specific TFs, resolving gene symbols to JASPAR Matrix IDs, or getting TF metadata. Supports multiple output formats (MEME, TRANSFAC, PFM, JASPAR, YAML).":"查询 JASPAR 数据库中的转录因子 (TF) 结合图谱。在获取特定转录因子的位置频率矩阵 (PFM) 或位置权重矩阵 (PWM)、将基因符号解析为 JASPAR 矩阵 ID，或获取转录因子元数据时使用。支持多种输出格式（MEME、TRANSFAC、PFM、JASPAR、YAML）。","Search for scientific papers, preprints, and publications on arXiv. Extract metadata, abstracts, and download full-text PDFs or HTML versions of papers. Use when the user asks to find research papers, literature, or specific arXiv IDs.":"在 arXiv 上搜索科研论文、预印本和学术出版物。提取元数据、摘要，并下载论文全文 PDF 或 HTML 版本。当用户要求查找研究论文、文献或特定 arXiv ID 时使用。","Browse, filter, and download life sciences, biology, and medical preprints from bioRxiv and medRxiv. Supports fetching paper metadata by DOI, and browsing by date range with category and keyword filters. Keyword filtering is local, so date ranges MUST be narrow (1-4 weeks) with a category to prevent timeouts.":"浏览、筛选并下载来自 bioRxiv 和 medRxiv 的生命科学、生物学和医学预印本。支持通过 DOI 获取论文元数据，以及按日期范围结合分类和关键词过滤浏览。由于关键词过滤在本地执行，日期范围必须设置得较窄（1-4 周）并配合分类，以防请求超时。","Search Europe PMC for scientific literature and download open-access full texts and PDFs. Retrieve full-text XML/plain text by PMCID, get citation lists and bibliography.":"在 Europe PMC 中搜索科研文献，并下载开放获取 (Open Access) 的全文与 PDF。通过 PMCID 获取全文 XML/纯文本，获取引用清单和参考文献。","Query the OpenAlex scholarly database for research papers, authors, institutions, topics, sources, publishers, funders, geo-locations, and keywords. Use when searching academic papers, resolving DOIs, downloading open-access PDFs, finding an author's publications, aggregating bibliometric data (citation counts, h-index, impact factor), exploring the research taxonomies, or performing DOI lookups.":"查询 OpenAlex 学术数据库，涵盖研究论文、学者、科研机构、研究主题、期刊来源、出版商、资助机构、地理位置和关键词。在检索学术论文、解析 DOI、下载开放获取 PDF、查找作者发表物、汇总文献计量数据（被引频次、h 指数、影响因子）、探索学科分类或执行 DOI 反查时使用。","Retrieve protein and nucleotide sequences from NCBI databases using E-utilities. Supports direct accession lookup, CDS translation, gene+organism search, locus lookup, PubMed-linked sequences, patent protein extraction, and organism+length fallback search. Use when you need to fetch biological sequences by accession, gene name, locus tag, PubMed ID, or patent number.":"使用 E-utilities 从 NCBI 数据库中检索蛋白质和核苷酸序列。支持直接通过 Accession 查找、CDS 编码区翻译、基因+物种搜索、基因座查询、PubMed 关联序列、专利蛋白质提取以及物种+长度回退搜索。在需要通过编号、基因名称、Locus 标签、PubMed ID 或专利号获取生物序列时使用。","Query, search, and download data from the openFDA API for drugs, devices, foods, tobacco, cosmetics, animal and veterinary products, substances, and transparency data. Use for FDA adverse events, recalls, labeling, approvals, shortages, 510(k) clearances, NDC lookups, and any FDA safety or regulatory data query across all 28 API endpoints.":"从 openFDA API 查询、搜索并下载药品、医疗器械、食品、烟草、化妆品、动保产品、物质以及透明度数据。用于 FDA 不良事件报告、产品召回、药品标签、上市审批、药物短缺、510(k) 许可、NDC 编号查询，以及跨全部 28 个 API 端点的任何 FDA 安全或监管数据查询。","Query Open Targets Platform for target-disease associations, drug target discovery, tractability/safety data, genetics/omics evidence, known drugs, for therapeutic target identification.":"查询 Open Targets 平台以获取靶点与疾病关联、药物靶点发现、成药性/安全性数据、遗传学/多组学证据以及已知药物，用于治疗靶点识别。","Use when you want to search for or download experimentally-determined 3D structures for biomolecules (proteins, nucleic acids, bound ligands). Supports searching by sequence similarity, structure similarity, chemical and other attributes. Also use to get metadata about biomolecular structure experiments.":"在需要检索或下载经实验测定的生物大分子（蛋白质、核酸、结合配体）3D 结构时使用。支持按序列相似性、结构相似性、化学特性及其他属性进行检索，也可用于获取生物分子结构实验的元数据。","Ancient text restoration, attribution, dating, contextualization, and embedding via Aeneas (Latin) / Ithaca (Ancient Greek). Use when asked to \"restore\", \"attribute\", \"date\", \"contextualize\", \"find parallels\", \"where was it written\", \"when was it written\", \"embed\", or \"analyze\" an ancient text, inscription, or epigraphic document, or when the user mentions \"Aeneas\", or \"Ithaca\".":"通过 Aeneas（拉丁语）/ Ithaca（古希腊语）进行古文献修复、归属推断、年代测定、语境还原与嵌入表示。当被要求“修复”、“归属”、“测定年代”、“语境分析”、“寻找平行文本”、“书写地点”、“成文时间”、“嵌入”或“分析”古代文本、铭文或金石文献，或用户提及 Aeneas / Ithaca 时使用。","Performs multiple sequence alignment of proteins with EBI Clustal Omega. Use when you need to align multiple sequences to assess similarity, domain conservation, or key residue conservation. Supports up to 4000 sequences and a maximum file size of 4 MB. Do not use to search for homologous proteins in a database (use MMseqs2, BLAST), align non-protein sequences (DNA, RNA), perform structural alignment (use Foldseek, PyMOL), or if you only have a single sequence.":"使用 EBI Clustal Omega 对蛋白质进行多序列比对 (MSA)。在需要对齐多条序列以评估相似度、结构域保守性或关键残基保守性时使用。支持多达 4000 条序列，最大文件 4 MB。请勿用于数据库中的同源蛋白搜索（应使用 MMseqs2/BLAST）、非蛋白质序列比对（DNA/RNA）、结构对齐（应使用 Foldseek/PyMOL）或仅有一条序列的场景。","Searches for homologous protein sequences using MMseqs2 (fast, default) or BLAST (comprehensive, fallback). Trigger this whenever the user provides a protein sequence or FASTA file and asks to find homologues, sequence matches, or wants to infer protein function based on sequence similarity, but not when the user wants to infer protein function based on structural similarity.":"使用 MMseqs2（极速，默认）或 BLAST（全面，回退方案）检索同源蛋白质序列。每当用户提供蛋白质序列或 FASTA 文件并要求查找同源物、序列匹配，或希望基于序列相似性推断蛋白质功能时触发；但不用于基于结构相似性推断蛋白质功能。","Query PubChem, search by name/CID/SMILES, retrieve properties, similarity/substructure searches, bioactivity, for cheminformatics. Use when a user asks about a specific chemical, drug, or molecule.":"查询 PubChem，支持按名称/CID/SMILES 进行检索，获取理化性质、相似性/子结构检索、生物活性数据，用于化学信息学。当用户询问特定化学品、药物或分子时使用。","Search PubMed for scientific literature, including published clinical trials. Fetch abstracts and full text. Link published research to biological databases (gene, protein, nucleotide, PubChem) to discover associations between papers and specific compounds or genes. Verify medical spelling, match raw citations, and cache result sets for bulk processing. Interfaces NCBI E-utilities and PMC BioC APIs.":"在 PubMed 中检索科学文献，包括已发表的临床试验。获取摘要和全文。将已发表的研究与生物学数据库（基因、蛋白质、核苷酸、PubChem）关联，以发现论文与特定化合物或基因之间的联系。验证医学拼写、匹配原始引用，并缓存结果集以供批量处理。与 NCBI E-utilities 和 PMC BioC API 对接。","Visualize, analyze, and render protein and molecular structures using PyMOL. Use when the user wants to create images of protein structures, perform structural alignments or superposition, measure distances or contacts, highlight binding sites or active site residues, color by B-factor/pLDDT, or analyze protein-ligand interactions. Do not use for docking, molecular dynamics, or sequence-only analysis.":"使用 PyMOL 可视化、分析和渲染蛋白质及分子结构。当用户希望生成蛋白质结构图像、执行结构对齐或叠合、测量原子间距或接触、高亮结合位点或活性中心残基、按 B-factor/pLDDT 上色，或分析蛋白质-配体相互作用时使用。请勿用于分子对接、分子动力学模拟或纯序列分析。","Query the QuickGO and Evidence & Conclusion Ontology (ECO) REST API. Use this when you need to map genes to biological processes, molecular functions, or cellular components, find genes associated with a specific pathway/GO term, or explore the Gene Ontology hierarchy. Do not use for querying drug targets (use OpenTargets) or mechanistic signaling pathway diagrams (use KEGG).":"查询 QuickGO 和证据与结论本体 (ECO) REST API。在需要将基因映射到生物学过程、分子功能或细胞组分、查找与特定通路/GO 术语相关的基因，或浏览基因本体 (Gene Ontology) 层级时使用。请勿用于药物靶点查询（应使用 OpenTargets）或机制性信号通路图绘制（应使用 KEGG）。","Query the Reactome database (Analysis and Content Services). Use when the user asks about pathway analysis, gene list enrichment, retrieving results by token, finding unmapped or not-found identifiers, mapping identifiers, reaction participants (inputs, outputs), pathway hierarchy (including top-level pathways), diagram export, cross-reference mapping, or searching the knowledgebase.":"查询 Reactome 数据库（分析与内容服务）。当用户询问通路分析、基因列表富集、通过 Token 检索结果、查找未映射标识符、映射 ID、反应参与物（输入、输出）、通路层级树（包括顶层通路）、导出通路图谱、交叉引用映射或检索知识库时使用。","Query the STRING database for protein-protein interactions (PPIs), functional enrichment, and homology. Use when the user asks about interactions between specific proteins, interaction evidence, confidence scores, protein interaction partners, or pathway enrichments.":"查询 STRING 数据库以获取蛋白质-蛋白质相互作用 (PPI)、功能富集分析和同源性。当用户询问特定蛋白质之间的相互作用、相互作用证据、置信度得分、蛋白质相互作用伴侣或通路富集时使用。","Fetch Evolutionary Conservation scores (phyloP, phastCons) and Transcription Factor Binding Sites (TFBS) from the UCSC Genome Browser. Use when analyzing whether genomic variants or regions are evolutionarily conserved, functionally important, or bounded by TF regulators across major projects (ENCODE, JASPAR, ReMap).":"从 UCSC 基因组浏览器获取进化保守性评分（phyloP、phastCons）及转录因子结合位点 (TFBS)。在跨主要项目（ENCODE、JASPAR、ReMap）分析基因组变异或区域是否具有进化保守性、重要功能或转录因子调控结合时使用。","Queries the UniBind database for experimentally validated transcription factor (TF) binding sites. Use when retrieving direct TF-DNA interaction datasets, downloading binding site coordinates (BED/FASTA) for local analysis, or listing available datasets by species, cell line, or TF name. Don't use to query specific intervals, locations, genes, motif models or expression data.":"查询 UniBind 数据库中经过实验验证的转录因子 (TF) 结合位点。在检索直接的 TF-DNA 相互作用数据集、下载结合位点坐标 (BED/FASTA) 进行本地分析，或按物种、细胞系或 TF 名称列出可用数据集时使用。不要用于查询特定区间、位置、基因、基序模型或表达数据。","Access protein metadata, function, taxonomy, and sequences across UniProtKB, UniParc, and UniRef. Use when searching for proteins, mapping identifiers, or retrieving functional annotations and publications. Don't use for sequence alignment, protein folding, or sequence similarity search (use specialized skills for those tasks).":"跨 UniProtKB、UniParc 和 UniRef 访问蛋白质元数据、功能、分类学和序列。在搜索蛋白质、映射标识符或检索功能注释与出版物时使用。不要用于序列比对、蛋白质折叠或序列相似性搜索（这些任务应使用专用技能）。","Checks whether the uv Python package manager is installed and installs it if missing. Ensures uv is on PATH. Use when another skill requires uv as a prerequisite.":"检查是否安装了 uv Python 包管理器，若缺失则予以安装。确保 uv 存在于系统环境变量 PATH 中。当其他技能需要 uv 作为前置先决条件时使用。","Distills a completed user workflow or interaction into a reusable agent skill. Use when the user asks to turn their workflow, interaction, or multi-step process into a skill, or when they say \"make this a skill\", \"create a skill from what we just did\", \"package this workflow\" or similar. Do not use for creating skills from scratch without an existing workflow (use a generic skill-creator for that).":"将已完成的用户工作流或交互提炼为可复用的代理技能。当用户要求将其工作流、交互或多步流程转化为技能，或说出“将此做成技能”、“根据我们刚才的操作创建技能”、“打包此工作流”或类似要求时使用。若无现有工作流需要从头创建技能，请勿使用（应使用通用技能创建器）。"};
  const nodeOriginals = window.__antigravityZhPatchNodeOriginals ||= new WeakMap();
  const elementOriginals = window.__antigravityZhPatchElementOriginals ||= new WeakMap();
  const translationCache = new Map();
  const themePresetNames = new Set(['Catppuccin', 'Dracula', 'Monokai', 'One Light', 'One Dark Pro', 'Tokyo Night', 'Solarized Light', 'Solarized Dark', 'Vesper', 'Gruvbox Material', 'Gruvbox']);
  const diffSourceNames = new Set(['all agent edits', 'single edit', 'uncommitted', 'staged', 'branch changes', 'commit']);
  const MAX_CACHE_ENTRIES = 4000;
  const detailRoots = new WeakMap();
  // Render an independently prepared full document. Keep the React-owned
  // original tree in place, so closing/updating the modal and English restore
  // retain their original nodes and event handlers.
  const detailViews = window.__antigravityZhDetailViews ||= new Map();
  function removeDetailView(source, record) {
    record.view.remove();
    if (source.hidden) source.hidden = record.hidden;
    if (source.getAttribute('style') === record.appliedStyle) {
      if (record.style === null) source.removeAttribute('style'); else source.setAttribute('style', record.style);
    }
    detailViews.delete(source);
  }
  for (const [source, record] of detailViews) removeDetailView(source, record);
  const normalizeDetail = value => value.replace(/\s+/g, ' ').trim();
  function detailSource(root) {
    return [...root.querySelectorAll('[data-zh-skill-body], .leading-relaxed.select-text')]
      .find(e => !e.closest('[data-antigravity-zh-detail-view]'));
  }
  function sourceDocument(source) {
    if (!source) return undefined;
    const key = Object.keys(source).find(k => k.startsWith('__reactFiber$'));
    let fiber = key && source[key];
    // A DOM node retains the Fiber from its first render. After React switches
    // its alternating trees, use the committed host Fiber and its current props.
    if (fiber) {
      let top = fiber;
      while (top.return) top = top.return;
      if (top.stateNode?.current) {
        const pending = [top.stateNode.current];
        while (pending.length) {
          const current = pending.pop();
          if (current.stateNode === source) { fiber = current; break; }
          for (let child = current.child; child; child = child.sibling) pending.push(child);
        }
      }
    }
    for (let depth = 0; fiber && depth < 40; depth++, fiber = fiber.return) {
      const raw = fiber.memoizedProps?.markdown;
      if (typeof raw !== 'string') continue;
      const markdown = raw.replace(/\r\n/g, '\n').replace(/^---\n[\s\S]*?\n---\s*/, '').trim();
      let fingerprint = 2166136261;
      for (let i = 0; i < markdown.length; i++) fingerprint = Math.imul(fingerprint ^ markdown.charCodeAt(i), 16777619) >>> 0;
      return detailDocuments.find(d =>
        (d.markdownLength === markdown.length && d.markdownFingerprint === fingerprint.toString(16)) ||
        (d.previewLength === markdown.length && d.previewFingerprint === fingerprint.toString(16))) || null;
    }
    return undefined;
  }
  function detailDocument(element) {
    const root = element?.closest('[data-testid="doc-row-modal"]');
    if (!root) return null;
    if (!detailRoots.has(root)) {
      // Prefer the Markdown supplied to the native React renderer. Code
      // controls and alert components change textContent, but not that input.
      // A changed source explicitly fails matching rather than showing an old
      // full-document translation over a new or custom document.
      const exact = sourceDocument(detailSource(root));
      const withoutAlerts = value => normalizeDetail(value).replace(/\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/g, '');
      const original = withoutAlerts(originalElementText(root));
      const doc = exact !== undefined ? exact : detailDocuments.find(d => !d.requireExact && d.signature && original.includes(withoutAlerts(d.signature)) &&
        (!d.heading || original.includes(d.heading))) || null;
      detailRoots.set(root, doc);
    }
    return detailRoots.get(root);
  }
  function translateDetailText(node) {
    const parent = node.parentElement;
    const root = parent?.closest('[data-testid="doc-row-modal"]');
    if (!root) return false;
    if (parent.closest('[data-antigravity-zh-detail-view]')) return true;
    for (const source of detailViews.keys()) if (source.contains(node)) return true;
    // A detail document is content with rich structure. Never run paragraph
    // summaries or 35-character prefix matches on any of its descendants.
    const original = originalText(node), core = original?.trim();
    if (!core) return true;
    const key = normalizeDetail(core);
    let translated;
    const doc = detailDocument(parent);
    const source = detailSource(root);
    if (!doc && source?.contains(node)) { restoreNode(node); return true; }
    if (doc?.overrides && Object.hasOwn(doc.overrides, key)) translated = doc.overrides[key];
    else if (doc && Object.hasOwn(skillDetails.translations, key)) translated = skillDetails.translations[key];
    // The modal's short description is independently localized, even when a
    // newer document body has not yet acquired a matching catalogue entry.
    else if (allOfficialSkillsMap[key]) translated = allOfficialSkillsMap[key];
    else if (translations.has(key)) translated = translations.get(key);
    if (translated !== undefined) writeText(node, original.replace(core, translated), original);
    else restoreNode(node);
    return true;
  }
  function translateDetailElement(element) {
    if (!element.closest('[data-testid="doc-row-modal"]')) return false;
    if (element.closest('[data-antigravity-zh-detail-view]')) return true;
    ensureDetailView(element);
    for (const source of detailViews.keys()) if (source === element || source.contains(element)) return true;
    const root = element.closest('[data-testid="doc-row-modal"]'), source = detailSource(root);
    if (!detailDocument(element) && source?.contains(element)) { restoreNode(element); return true; }
    for (const attr of translatableAttributes) {
      if (!element.hasAttribute(attr)) continue;
      const original = originalAttribute(element, attr), key = normalizeDetail(original || '');
      const translated = detailDocument(element) && Object.hasOwn(skillDetails.translations, key)
        ? skillDetails.translations[key] : allOfficialSkillsMap[key] || translateValue(original);
      writeAttribute(element, attr, translated, original);
    }
    return true;
  }
  function ensureDetailView(element) {
    const root = element.closest('[data-testid="doc-row-modal"]');
    if (!root || isConversationContent(root)) return;
    const doc = detailDocument(root);
    for (const [source, record] of detailViews) {
      if (!source.isConnected || (root.contains(source) && record.doc !== doc)) removeDetailView(source, record);
    }
    if (!doc?.renderedHtml) return;
    const source = detailSource(root);
    if (!source || detailViews.has(source)) return;
    // Recover v58's applied text before hiding the original. Existing copy
    // controls and link handlers continue to reference the original content.
    for (const node of nodesIn(source, false)) restoreNode(node);
    const view = document.createElement('div');
    view.className = source.className + ' antigravity-zh-detail-view';
    view.setAttribute('data-antigravity-zh-detail-view', doc.plugin + '/' + doc.skill);
    view.innerHTML = doc.renderedHtml;
    const style = document.createElement('style');
    style.textContent = '.antigravity-zh-detail-view{min-width:0;max-width:100%;overflow-wrap:anywhere}' +
      '.antigravity-zh-detail-view .zh-table-scroll{max-width:100%;overflow-x:auto;margin:12px 0}' +
      '.antigravity-zh-detail-view table{width:100%;border-collapse:collapse;font-size:inherit}' +
      '.antigravity-zh-detail-view th,.antigravity-zh-detail-view td{border:1px solid var(--border,#ddd);padding:8px 12px;vertical-align:top;text-align:left;min-width:110px;line-height:1.65}' +
      '.antigravity-zh-detail-view th{font-weight:600;background:var(--muted,rgba(127,127,127,.10))}' +
      '.antigravity-zh-detail-view td code,.antigravity-zh-detail-view th code{word-break:normal;overflow-wrap:normal}' +
      '.antigravity-zh-detail-view td:first-child code{white-space:nowrap}' +
      '.antigravity-zh-detail-view pre{position:relative;white-space:pre;overflow:auto;max-width:100%;padding:32px 14px 14px;margin:12px 0;border:1px solid var(--border,#ddd);border-radius:8px;background:var(--muted,rgba(127,127,127,.07))}' +
      '.antigravity-zh-detail-view pre code{white-space:pre;overflow-wrap:normal;background:transparent!important;padding:0!important}' +
      '.antigravity-zh-detail-view .zh-copy-code{position:absolute;right:8px;top:5px;padding:1px 8px;border-radius:4px;font:12px/1.6 inherit;cursor:pointer}' +
      '.antigravity-zh-detail-view .zh-alert{border-left:3px solid var(--border,#aaa);padding:4px 12px;margin:12px 0}';
    view.prepend(style);
    for (const pre of view.querySelectorAll('pre')) {
      const code = pre.querySelector('code'); if (!code) continue;
      const button = document.createElement('button'); button.className = 'zh-copy-code';
      button.type = 'button'; button.textContent = '复制';
      button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(code.textContent); button.textContent = '已复制'; }
        catch { button.textContent = '复制失败'; }
      }); pre.prepend(button);
    }
    view.addEventListener('click', event => {
      const link = event.target.closest('a[href]'); if (!link || !view.contains(link)) return;
      const original = [...source.querySelectorAll('a[href]')].find(a => a.getAttribute('href') === link.getAttribute('href'));
      if (original) { event.preventDefault(); original.click(); }
    });
    const record = { view, doc, hidden: source.hidden, style: source.getAttribute('style') };
    source.hidden = true; source.style.setProperty('display', 'none', 'important');
    record.appliedStyle = source.getAttribute('style');
    detailViews.set(source, record); source.after(view);
  }
  function invalidateDetail(node) {
    const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    const root = element?.closest?.('[data-testid="doc-row-modal"]');
    if (root) detailRoots.delete(root);
  }

    function translateDuration(value) {
    return value
      .replace(/(\d+)\s+days?/gi, "$1 天")
      .replace(/(\d+)\s+hours?/gi, "$1 小时")
      .replace(/(\d+)\s+minutes?/gi, "$1 分钟")
      .replace(/(\d+)\s+seconds?/gi, "$1 秒")
      .replace(/,\s*/g, " ");
  }

  function translateToolSummaryItem(value) {
    return value
      .replace(/(\d+)\s+files?/gi, "$1 个文件")
      .replace(/(\d+)\s+folders?/gi, "$1 个文件夹")
      .replace(/(\d+)\s+searches?/gi, "$1 次搜索")
      .replace(/(\d+)\s+commands?/gi, "$1 个命令")
      .replace(/(\d+)\s+tasks?/gi, "$1 个任务")
      .replace(/(\d+)\s+pages?/gi, "$1 个页面")
      .replace(/(\d+)\s+browsers?/gi, "$1 个浏览器操作")
      .replace(/(\d+)\s+images?/gi, "$1 张图片")
      .replace(/(\d+)\s+actions?/gi, "$1 个操作")
      .replace(/(\d+)\s+artifacts?/gi, "$1 个成果");
  }

  function formatRuleTarget(raw) {
    if (!raw) return "";
    const trimmed = raw.trim();
    if (!trimmed) return "";
    if (/^['"](.*)['"]$/.test(trimmed)) {
      return `“${trimmed.slice(1, -1)}”`;
    }
    return `“${trimmed}”`;
  }

  const reviewedUiTemplateRules = Object.entries(skillDetails.uiTemplates || {}).sort((a, b) => b[0].replace(/\{\d+\??\}/g, '').length - a[0].replace(/\{\d+\??\}/g, '').length).map(([source, target]) => {
    const ids = [], token = /\{(\d+)(\?)?\}/g;
    const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let pattern = '', offset = 0, match;
    while ((match = token.exec(source))) {
      pattern += escape(source.slice(offset, match.index)) + (match[2] ? '(.*?)' : '(.+?)');
      ids.push(match[1]); offset = token.lastIndex;
    }
    pattern += escape(source.slice(offset));
    const rule = [new RegExp('^' + pattern + '$'), m => target.replace(/\{(\d+)\}/g, (_, id) => {
      const value = m[ids.indexOf(id) + 1];
      return value;
    })];
    rule.fallback = /^(?:Open|View|Close|Unpin|Delete|Enable|Toggle|Allow|Select|Enter|New|Add|Copy) \{0\}(?:\.\.\.)?$/.test(source);
    return rule;
  });
  const regexTranslations = [
    [/^Resets in (<1m|\d+[dhms](?:\s+\d+[dhms])*)$/, m => m[1] === '<1m' ? '不到 1 分钟后重置' : `${m[1].replace(/(\d+)([dhms])/g, (_, n, u) => `${n} ${{d:'天',h:'小时',m:'分钟',s:'秒'}[u]}`)}后重置`],
    [/^Included by (.+)$/, m => `由 ${m[1]} 引入`],
    [/^Installed in (.+)$/, m => `安装于 ${m[1]}`],
    [/^(.+?)([’'])s server IP address could not be found\.$/, m => `找不到 ${m[1]} 的服务器 IP 地址。`],
    [/^(.+) refused to connect\.$/, m => `${m[1]} 拒绝了连接。`],
    [/^(.+) took too long to respond\.$/, m => `${m[1]} 响应超时。`],
    [/^Requires manual confirmation: ([\s\S]+)$/, m => `需要手动确认：${m[1]}`],
    [/^(Minimum|Maximum) length is (\d+)$/, m => `${m[1] === 'Minimum' ? '最短' : '最长'}长度为 ${m[2]}`],
    [/^(Side question failed|Attachment error|Upload error|MCP error): ([\s\S]+)$/, m => `${{'Side question failed':'附加问题处理失败','Attachment error':'附件错误','Upload error':'上传错误','MCP error':'MCP 错误'}[m[1]]}：${m[2]}`],
    [/^Message queued\.(?: (\d+) messages in queue\.)? Sends after agent finishes working\. Actions available: Send Now, Edit, Delete\.$/, m => `消息已排队。${m[1] ? `队列中有 ${m[1]} 条消息。` : ''}代理完成工作后发送。可用操作：立即发送、编辑、删除。`],
    [/^Filter skills and rules: (All|Skills|Rules)$/, m => `筛选技能与规则：${{All:'全部',Skills:'技能',Rules:'规则'}[m[1]]}`],
    [/^Enter Time Zone(?:\.\.\.|…)$/, () => '输入时区…'],
    [/^See (more|less) in Build with Google$/, m => `${m[1] === 'more' ? '查看更多' : '收起'}“基于 Google 构建”内容`],
    [/^Show (\d+) breakdowns?$/, m => `显示 ${m[1]} 项明细`],
    ...reviewedUiTemplateRules.filter(rule => !rule.fallback),
    [/^Make (.+) the default (.+) account$/, m => `将 ${m[1]} 设为默认的 ${m[2]} 账号`],
    [/^(\d+) accounts$/, m => `${m[1]} 个账号`],
    [/^Install folder "(.+)" is already in use$/, m => `安装文件夹“${m[1]}”已被占用`],
    [/^Configure (.+), values missing$/, m => `配置 ${m[1]}，缺少配置值`],
    [/^New secret for (.+)$/, m => `${m[1]} 的新密钥`],
    [/^Reconnect (.+)$/, m => `重新连接 ${m[1]}`],
    [/^Disconnect (.+)$/, m => `断开 ${m[1]} 的连接`],
    [/^Connect (?!to\b|an?\b)(.+)$/, m => `连接 ${m[1]}`],
    [/^Couldn't load apps: ([\s\S]+)$/, m => `无法加载应用：${m[1]}`],
    [/^No apps found for "(.+)"\.$/, m => `未找到与“${m[1]}”匹配的应用。`],
    [/^Cancel Questionnaire and Stop the Agent \((.+)\)$/, m => `取消问卷并停止智能体（${m[1]}）`],
    [/^Sort and filter conversations \((\d+) active\)$/, m => `排序与筛选对话（${m[1]} 项已启用）`],
    [/^Turn (\d+)$/, m => `第 ${m[1]} 轮`],
    [/^Turns (\d+)\u2013(\d+)$/, m => `第 ${m[1]}–${m[2]} 轮`],
    [/^(\d+) turns?$/, m => `${m[1]} 轮`],
    [/^Go to turn (\d+) of (\d+)$/, m => `转到第 ${m[1]} 轮（共 ${m[2]} 轮）`],
    [/^The selected (project|workspace|environment) can't be found\. Pick another \1 from the \1 selector to send\.$/, m => {
      const s = { project: '项目', workspace: '工作区', environment: '环境' }[m[1]] || m[1];
      return `找不到所选的${s}。请从${s}选择器中选择其他${s}后再发送。`;
    }],
    [/^Not a plain relative artifact path: (.+)$/, m => `不是普通的相对成果路径：${m[1]}`],
    [/^Not a type the pane opens: (.+)$/, m => `不是面板支持打开的类型：${m[1]}`],
    [/^HTML opens only from cos_canvas\/: (.+)$/, m => `仅支持从 cos_canvas/ 打开 HTML：${m[1]}`],
    [/^Not a canvas page name: (.+)$/, m => `不是有效的画布页面名称：${m[1]}`],
    [/^Set up (.+)$/, m => `设置 ${m[1]}`],
    [/^Review permissions for (.+)$/, m => `检查 ${m[1]} 的权限`],
    [/^(.+), (\d+) grants?$/, m => `${translations.get(m[1]) || m[1]}，${m[2]} 项授权`],
    [/^Adding plugins from (.+)$/, m => `正在从 ${m[1]} 添加插件`],
    [/^Add (\d+) plugins? from (.+)$/, m => `从 ${m[2]} 添加 ${m[1]} 个插件`],
    [/^Add all \u00b7 (\d+)$/, m => `全部添加 · ${m[1]}`],
    [/^(Disable|Enable) (.+) tool for (.+)$/, m => `为 ${m[3]} ${m[1] === 'Disable' ? '禁用' : '启用'} ${m[2]} 工具`],
    [/^(\d+) tools$/, m => `${m[1]} 个工具`],
    [/^App view for (.+)$/, m => `${m[1]} 的应用视图`],
    [/^\((\d+) steps?\)$/, m => `（${m[1]} 步）`],
    [/^\+(\d+) more$/, m => `另有 ${m[1]} 项`],
    [/^See (\d+) more (?!in\s)(.+)$/, m => `再查看 ${m[1]} 项${translations.get(m[2]) || m[2]}`],
    [/^See more (?!in\s)(.+)$/, m => `查看更多${translations.get(m[1]) || m[1]}`],
    [/^gates (.+) \+(\d+) more$/, m => `控制 ${m[1]} 等另外 ${m[2]} 项`],
    [/^gates (.+)$/, m => `控制 ${m[1]}`],
    [/^(\d+) demoted$/, m => `${m[1]} 项已降级`],
    [/^(\d+) excluded$/, m => `${m[1]} 项已排除`],
    [/^(\d+) rules? exceeded the rules budget and (?:was|were) demoted from full inline content to a file-path pointer\.$/, m => `${m[1]} 条规则超出规则预算，已从完整内嵌内容降级为文件路径引用。`],
    [/^(\d+) items? in (.+) exceeded the customization budget and (?:was|were) excluded from context\.$/, m => `${m[2]} 中的 ${m[1]} 项超出自定义项预算，已从上下文中排除。`],
    [/^Failed to save project branch: ([\s\S]+)$/, m => `保存项目分支失败：${m[1]}`],
    // 浏览器动作元素点击标题 (带动态目标) (§5.1 规则)
    [/^(Clicking|Clicked)\s+element\s+(.+)$/, (m) => `${m[1] === "Clicking" ? "正在点击元素" : "已点击元素"} ${m[2]}`],
    // Built-in skills descriptions fuzzy & robust matching
    [/^Build, package, run, and debug UI extensions for Antigravity[\s\S]*$/i, () => "为 Antigravity 构建、打包、运行和调试 UI 扩展：在侧边面板中显示的交互式 Web 面板，由使用内置 Sidecar SDK 的 Node.js Sidecar 提供服务。"],
    [/^Discover UI plugin panels relevant to the current task[\s\S]*$/i, () => "发现与当前任务相关的 UI 插件面板，并在对话中提供一键快捷按钮以在侧边栏打开（切换）。当运行中的 UI 插件面板对当前操作有帮助，或用户刚启用新 UI 插件面板需要快捷入口时使用。"],
    [/^Automatically migrate legacy workflows to modern skills[\s\S]*$/i, () => "自动将旧版工作流迁移为现代技能（涵盖全局与工作区配置）。扫描现有工作流，创建目标 SKILL.md 文件，并安全归档旧的工作流文件。"],
    [/^Guidelines for interacting with GitHub and request permissions[\s\S]*$/i, () => "与 GitHub 交互的指导原则，并在命令因代理环境限制而失败时向用户申请权限。"],
    [/^Comprehensive guide and reference for the Antigravity Customization System[\s\S]*$/i, () => "Antigravity 自定义系统的综合指南与参考。用于说明自定义项的工作方式、加载优先级和发现机制，并指导创建技能、规则、插件、钩子及 MCP 服务器。"],
    [/^How to manage and create plugins[\s\S]*$/i, () => "介绍如何管理和创建插件——插件是带命名空间的技能、代理、规则、MCP 服务器和钩子集合，可以作为一个整体安装、启用或禁用。当用户要启用、禁用、安装、卸载或创建插件，或需要把新自定义项打包成插件时使用，也可由 /plugin 命令触发。底层自定义系统、发现路径、加载优先级或独立技能等内容请参阅自定义指南。"],
    [/^How to render rich interactive HTML widgets inline[\s\S]*$/i, () => "介绍如何在对话中内嵌或作为独立成果呈现丰富的交互式 HTML 组件。适用于图表、数据可视化、交互控件、教学演示及其他超越纯文本和 Markdown 的视觉内容。"],
    [/^Interactive guide to design and create a scheduled background automation[\s\S]*$/i, () => "用于设计和创建定时后台自动化的交互式指南。当用户希望创建自动或周期性定时任务时使用，也可由 /automation 命令触发。"],
    [/^Provides a comprehensive guide, quick reference, and sitemap for Google Antigravity[\s\S]*$/i, () => "提供 Google Antigravity（AGY）的综合指南、快速参考和站点地图，涵盖 Antigravity CLI（agy）、Antigravity 2.0、Antigravity IDE、Python SDK、斜杠命令、快捷键及自定义项（技能、规则、MCP、Sidecar）。当用户询问如何使用、配置或自定义这些产品时启用。"],
    // Automations and Slash commands
    [/^Search automations\.\.\.$/i, () => "搜索自动化任务…"],
    [/^No automations configured\.$/i, () => "未配置自动化任务。"],
    [/^No automations found\.$/i, () => "未找到自动化任务。"],
    [/^(?:automation\s+)?Guide me through creating an automated task$/i, () => "引导我创建自动化任务"],
    // Workspace & developer platform descriptions
    [/^Connect to Google Workspace, including Docs[\s\S]*$/i, () => "连接至 Google Workspace，包括 Docs、Sheets、Slides、Drive 和 Calendar。"],
    [/^Build on Google's developer platforms[\s\S]*$/i, () => "基于 Google 开发者平台进行开发，涵盖 Android、Chrome、Gemini 和 Google Cloud。"],
    // Marketplace plugin cards robust/truncated descriptions matching
    [/^Build applications with the Gemini Interact[\s\S]*$/i, () => "使用 Gemini Interactions API 构建应用…"],
    [/^Prototype, build & run modern apps that user[\s\S]*$/i, () => "利用 Firebase 原型设计、构建并运行现代应用…"],
    [/^Curated collection of agent skills for science[\s\S]*$/i, () => "针对科学计算任务精选的代理技能合集…"],
    [/^Using the Google Antigravity Python SDK[\s\S]*$/i, () => "使用 Google Antigravity Python SDK 构建 AI 代理…"],
    [/^Search and retrieve official documentation[\s\S]*$/i, () => "搜索并检索 Google 开发者产品的官方文档…"],
    [/^Integration skill and tools for Google Maps[\s\S]*$/i, () => "Google Maps Platform API 的集成技能与工具…"],
    [/^Official plugin for Dart and Flutter[\s\S]*$/i, () => "Dart 与 Flutter 官方插件，安装技能、规则、自定义代理和 Dart MCP 服务器…"],
    [/^This plugin provides a specialized suite of skill[\s\S]*$/i, () => "为数据科学与分析提供专用的技能套件…"],
    [/^(\d+)\s+tasks?\s+running$/i, (match) => `${match[1]} 个任务正在运行`],
    [/^(\d+)\s+tasks?\s+completed$/i, (match) => `${match[1]} 个任务已完成`],
    [/^(\d+)\s+seconds?$/i, m => `${m[1]} 秒`],
    [/^(\d+)\s+minutes?$/i, m => `${m[1]} 分钟`],
    [/^(\d+)\s+hours?$/i, m => `${m[1]} 小时`],
    [/^(\d+)\s+days?$/i, m => `${m[1]} 天`],
    [/^Select (.+) Theme$/, m => `选择 ${m[1]} 主题`],
    [/^Invalid notebook JSON: ([\s\S]+)$/, m => `笔记本 JSON 格式无效：${m[1]}`],
    [/^Unable to load PDF: ([\s\S]+)$/, m => `无法加载 PDF：${m[1]}`],
    [/^Failed to load PDF: ([\s\S]+)$/, m => `PDF 加载失败：${m[1]}`],
    [/^Please fill in all required fields: ([\s\S]+)$/, m => `请填写全部必填字段：${m[1]}`],
    [/^Failed to save configuration: ([\s\S]+)$/, m => `保存配置失败：${m[1]}`],
    [/^(.+) header$/, m => translations.has(m[1]) ? `${translations.get(m[1])}标题栏` : m[0]],
    [/^(\d+) of (\d+\+?)$/, m => `${m[1]} / ${m[2]}`],
    [/^Show (\d+) breakdowns?$/, m => `展开 ${m[1]} 项明细`],
    [/^Rules: (\d+) tokens$/, m => `规则：${m[1]} Token`],
    [/^(\d+) files? changed$/, m => `${m[1]} 个文件已更改`],
    [/^Fold lines (\d+)-(\d+)$/, m => `折叠第 ${m[1]} 至 ${m[2]} 行`],
    [/^(\d+)\s+questions?$/i, m => `${m[1]} 个问题`],
    [/^Question\s+(\d+)$/i, m => `问题 ${m[1]}`],
    [/^Question\s+(\d+)\s+of\s+(\d+)$/i, m => `问题 ${m[1]} / ${m[2]}`],
    [/^Version\s+(.+)$/, (match) => `版本 ${match[1]}`],
    [/^Select model, current:\s*(.+)$/, (match) => `选择模型，当前：${match[1]}`],
    [/^(.+?)\s*·\s*Context window$/i, (match) => `${match[1]} · 上下文窗口`],
    [/^Agent permissions preset selector, current:\s*(.+)$/, (match) => `代理权限预设选择器，当前：${match[1]}`],
    [/^This (.+) overrides your global permission settings\.$/, (match) => {
      const scope = { project: '项目', global: '全局', workspace: '工作区', environment: '环境' }[match[1].toLowerCase()] || match[1];
      return `此${scope}会覆盖你的全局权限设置。`;
    }],
    [/^Select project, current:\s*(.+)$/, (match) => `选择项目，当前：${match[1] === "No Project" ? "未选择项目" : match[1]}`],
    [/^You have used some of your weekly limit, it will fully refresh in (.+)\.$/, (match) => `你已使用部分每周额度，将在 ${translateDuration(match[1])}后完全恢复。`],
    [/^You have used some of your 5-hour limit, it will fully refresh in (.+)\.$/, (match) => `你已使用部分五小时额度，将在 ${translateDuration(match[1])}后完全恢复。`],
    [/^No more older messages, showing (\d+) of (\d+)$/, (match) => `没有更早的消息，当前显示 ${match[1]}/${match[2]} 条`],
    [/^Load older messages, showing (\d+) of (\d+)$/, (match) => `加载更早的消息，当前显示 ${match[1]}/${match[2]} 条`],
    [/^(Thought|Thinking)\s+for\s+((?:\d+(?:\.\d+)?\s*(?:h|hr|hrs|m|min|mins|s|sec|secs)\s*)+)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => {
      const isThinking = m[1].toLowerCase() === 'thinking';
      const time = m[2]
        .replace(/([\d.]+)\s*(?:hrs|hr|h)/gi, '$1 小时 ')
        .replace(/([\d.]+)\s*(?:mins|min|m)/gi, '$1 分钟 ')
        .replace(/([\d.]+)\s*(?:secs|sec|s)/gi, '$1 秒 ')
        .replace(/\s+/g, ' ').trim();
      return `${isThinking ? '正在思考' : '已思考'} ${time}`;
    }],
    [/^(Worked\s+for|Stopped\s+after)\s+((?:\d+(?:\.\d+)?\s*(?:h|hr|hrs|m|min|mins|s|sec|secs)\s*)+)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => {
      const isStopped = m[1].toLowerCase().startsWith('stopped');
      const time = m[2]
        .replace(/([\d.]+)\s*(?:hrs|hr|h)/gi, '$1 小时 ')
        .replace(/([\d.]+)\s*(?:mins|min|m)/gi, '$1 分钟 ')
        .replace(/([\d.]+)\s*(?:secs|sec|s)/gi, '$1 秒 ')
        .replace(/\s+/g, ' ').trim();
      return isStopped ? `已于 ${time} 后停止` : `已处理 ${time}`;
    }],
    // 命令运行具体步骤标题（优先匹配反引号与详细命令）
    [/^Ran\s+command:\s*(.+?)\s+\(`([^`]+)`\)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => "已运行命令：" + m[1] + " (`" + m[2] + "`)"],
    [/^Ran\s+command:\s*`([^`]+)`[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => "已运行命令：`" + m[1] + "`"],
    [/^Ran\s+command[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已运行命令'],
    [/^Running\s+command[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在运行命令'],

    // 复合动作汇总解析器（覆盖 pqb 生成的所有多动词或单动词+折叠角标组合）
    [/^(?:Exploring|Explored|Editing|Edited|Running|Ran|Analyzing|Analyzed|Searching|Searched|Reading|Read|Checking|Checked|Creating|Created|Viewing|Viewed|Writing|Wrote|Browsing|Browsed)[,\s\w\d\-_./\\]+[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => {
      const raw = m[0];
      const clean = raw.replace(/[\s›❯>⌄▾▼\u203A\u2304]+$/, '').trim();
      const segments = clean.split(',').map(s => s.trim()).filter(Boolean);
      const actionMap = {
        'exploring': '正在探索',
        'explored': '已探索',
        'exploring file': '正在探索文件',
        'exploring files': '正在探索文件',
        'explored file': '已探索文件',
        'explored files': '已探索文件',
        'exploring artifact': '正在探索成果',
        'exploring artifacts': '正在探索成果',
        'explored artifact': '已探索成果',
        'explored artifacts': '已探索成果',
        'exploring workspace': '正在探索工作区',
        'editing': '正在编辑',
        'edited': '已编辑',
        'editing file': '正在编辑文件',
        'editing files': '正在编辑文件',
        'edited file': '已编辑文件',
        'edited files': '已编辑文件',
        'editing artifact': '正在编辑成果',
        'editing artifacts': '正在编辑成果',
        'edited artifact': '已编辑成果',
        'edited artifacts': '已编辑成果',
        'creating artifact': '正在创建成果',
        'creating artifacts': '正在创建成果',
        'created artifact': '已创建成果',
        'created artifacts': '已创建成果',
        'running command': '正在运行命令',
        'running commands': '正在运行命令',
        'ran command': '已运行命令',
        'ran commands': '已运行命令',
        'running task': '正在运行任务',
        'running tasks': '正在运行任务',
        'ran task': '已运行任务',
        'ran tasks': '已运行任务',
        'analyzing': '正在分析',
        'analyzed': '已分析',
        'analyzing file': '正在分析文件',
        'analyzing files': '正在分析文件',
        'analyzed file': '已分析文件',
        'analyzed files': '已分析文件',
        'searching': '正在搜索',
        'searched': '已搜索',
        'searching files': '正在搜索文件',
        'searched files': '已搜索文件',
        'searching code': '正在搜索代码',
        'searched code': '已搜索代码',
        'reading file': '正在读取文件',
        'reading files': '正在读取文件',
        'read file': '已读取文件',
        'read files': '已读取文件',
        'checking task': '正在检查任务',
        'checked task': '已检查任务',
        'writing file': '正在写入文件',
        'wrote file': '已写入文件',
        'viewing file': '正在查看文件',
        'viewed file': '已查看文件',
      };
      let allMatched = true;
      const translatedSegs = segments.map(seg => {
        const lower = seg.toLowerCase();
        if (actionMap[lower]) return actionMap[lower];
        const countMatch = lower.match(/^(exploring|explored|editing|edited|running|ran|analyzing|analyzed|searching|searched|reading|read)\s+(\d+)\s+(files?|commands?|tasks?|searches?|artifacts?)$/);
        if (countMatch) {
          const verbMap = {
            exploring: '正在探索', explored: '已探索',
            editing: '正在编辑', edited: '已编辑',
            running: '正在运行', ran: '已运行',
            analyzing: '正在分析', analyzed: '已分析',
            searching: '正在搜索', searched: '已搜索',
            reading: '正在读取', read: '已读取'
          };
          const nounMap = {
            file: '个文件', files: '个文件',
            command: '个命令', commands: '个命令',
            task: '个任务', tasks: '个任务',
            search: '次搜索', searches: '次搜索',
            artifact: '个成果', artifacts: '个成果'
          };
          return `${verbMap[countMatch[1]] || countMatch[1]} ${countMatch[2]} ${nounMap[countMatch[3]] || countMatch[3]}`;
        }
        const runCmdMatch = seg.match(/^(Running|Ran)\s+(.+)$/i);
        if (runCmdMatch) {
          return `${runCmdMatch[1].toLowerCase() === 'running' ? '正在运行' : '已运行'} ${runCmdMatch[2]}`;
        }
        if (translations.has(seg)) return translations.get(seg);
        allMatched = false;
        return seg;
      });
      return allMatched ? translatedSegs.join('，') : clean;
    }],

    // 工具动作折叠行与状态步骤标题（带可选尾标 › / ⌄ / ▾ / ▼ / > / ❯）
    [/^Listed\s+(\d+)\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已列出 ${m[1]} 个任务`],
    [/^Listed\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已列出任务'],
    [/^Listing\s+(\d+)\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在列出 ${m[1]} 个任务`],
    [/^Listing\s+tasks?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在列出任务'],
    [/^Killed\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已终止任务 ${m[1]}` : '已终止任务'],
    [/^Killing\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在终止任务 ${m[1]}` : '正在终止任务'],
    [/^Killed\s+all\s+tasks[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已终止所有任务'],
    [/^Checked\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已检查任务 ${m[1]}` : '已检查任务'],
    [/^Checking\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在检查任务 ${m[1]}` : '正在检查任务'],
    [/^Sent\s+input\s+to\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已向任务发送输入 ${m[1]}` : '已向任务发送输入'],
    [/^Sending\s+input\s+to\s+task(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在向任务发送输入 ${m[1]}` : '正在向任务发送输入'],

    [/^Listed\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已列出 ${m[1]} 个子代理`],
    [/^Listed\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已列出子代理'],
    [/^Listing\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在列出 ${m[1]} 个子代理`],
    [/^Listing\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在列出子代理'],
    [/^Killed\s+all\s+subagents[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已终止所有子代理'],
    [/^Killed\s+subagent(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已终止子代理 ${m[1]}` : '已终止子代理'],
    [/^Killing\s+subagent(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在终止子代理 ${m[1]}` : '正在终止子代理'],
    [/^Invoked\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已调用 ${m[1]} 个子代理`],
    [/^Invoked\s+subagent(?::\s*|\s+)(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已调用子代理：${m[1]}`],
    [/^Invoked\s+subagent[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已调用子代理'],
    [/^Invoking\s+(\d+)\s+subagents?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在调用 ${m[1]} 个子代理`],
    [/^Invoking\s+subagent(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在调用子代理 ${m[1]}` : '正在调用子代理'],

    [/^Scheduled\s+timer(?:\s+for)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已设定定时器：${m[1]}` : '已设定定时器'],
    [/^Scheduling\s+timer(?:\s+for)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在设定定时器：${m[1]}` : '正在设定定时器'],
    [/^Scheduled\s+(?:cron|task)(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已设定定时任务 ${m[1]}` : '已设定定时任务'],
    [/^Scheduling\s+(?:cron|task)(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在设定定时任务 ${m[1]}` : '正在设定定时任务'],
    [/^Created\s+schedule[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已创建定时计划'],
    [/^Creating\s+schedule[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在创建定时计划'],

    [/^Sent\s+message(?:\s+to)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已向 ${m[1]} 发送消息` : '已发送消息'],
    [/^Sending\s+message(?:\s+to)?(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在向 ${m[1]} 发送消息` : '正在发送消息'],

    [/^Asked\s+(\d+)\s+questions?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已提出 ${m[1]} 个问题`],
    [/^Asking\s+(\d+)\s+questions?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `正在提出 ${m[1]} 个问题`],
    [/^Asked\s+(?:user\s+a\s+)?question[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '已向用户提问'],
    [/^Asking\s+(?:user\s+a\s+)?question[\s›❯>⌄▾▼\u203A\u2304]*$/i, () => '正在向用户提问'],

    [/^Viewed\s+file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已查看文件 ${m[1]}` : '已查看文件'],
    [/^Viewing\s+file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在查看文件 ${m[1]}` : '正在查看文件'],
    [/^Wrote\s+(?:to\s+)?file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已写入文件 ${m[1]}` : '已写入文件'],
    [/^Writing\s+(?:to\s+)?file(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在写入文件 ${m[1]}` : '正在写入文件'],
    [/^Replaced\s+content\s+in(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `已替换 ${m[1]} 中的内容` : '已替换文件内容'],
    [/^Replacing\s+content\s+in(?:\s+(.+?))?[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => m[1] ? `正在替换 ${m[1]} 中的内容` : '正在替换文件内容'],

    [/^Searched\s+for\s+"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已搜索“${m[1]}”`],
    [/^Searched\s+for\s+files:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已搜索文件：${m[1]}`],
    [/^Code\s+search:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `代码搜索：“${m[1]}”`],
    [/^Internal\s+search:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `内部搜索：“${m[1]}”`],
    [/^Listed\s+directory\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已列出目录 ${m[1]}`],
    [/^Browser\s+task:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `浏览器任务：“${m[1]}”`],
    [/^Opened\s+browser:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已打开浏览器：${m[1]}`],
    [/^Read\s+URL:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已读取 URL：${m[1]}`],
    [/^Searched\s+web:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已搜索网络：“${m[1]}”`],
    [/^Used\s+MCP\s+tool:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已使用 MCP 工具：${m[1]}`],
    [/^Used\s+tool:\s*(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已使用工具：${m[1]}`],
    [/^Generated\s+image:\s*"([^"]+)"[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已生成图像：“${m[1]}”`],

    // 成果与文件动作
    [/^Created\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已创建 ${m[1]}`],
    [/^Deleted\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已删除 ${m[1]}`],
    [/^Edited\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已编辑 ${m[1]}`],
    [/^Viewed\s+(.+?)[\s›❯>⌄▾▼\u203A\u2304]*$/i, (m) => `已查看 ${m[1]}`],

    // 任务与后台指示
    [/^(\d+)\s+background\s+tasks?\s+running$/i, (m) => `${m[1]} 个后台任务正在运行`],
    [/^(\d+)\s+subagents?\s+running$/i, (m) => `${m[1]} 个子代理正在运行`],
    [/^(\d+)\s+subagents?\s+completed$/i, (m) => `${m[1]} 个子代理已完成`],
    [/^(Running|Ran)\s+(&\s+.*|node\s+.*|[a-zA-Z0-9_\-\.\/\\]+\.(?:js|ts|py|sh|ps1|exe|bat|cmd).*)$/, (m) => `${m[1] === 'Running' ? '正在运行' : '已运行'} ${m[2]}`],
    [/^Opens external link:\s*(.+)$/, (match) => `打开外部链接：${match[1]}`],
    [/^See all\s*\((.+)\)$/, (match) => `查看全部 (${match[1]})`],
    [/^See (\d+) more$/, (match) => `再查看 ${match[1]} 项`],
    [/^See more in (.+)$/, (match) => `查看更多“${translations.get(match[1]) || match[1]}”内容`],
    [/^Media\s*\((.+)\)$/, (match) => `媒体 (${match[1]})`],
    [/^(?:Run\s+)?(.+)\s+finished$/i, (match) => `${match[1]} 已完成`],
    [/^(?:Run\s+)?(.+)\s+failed$/i, (match) => `${match[1]} 失败`],
    [/^Canceled edit to\s+(.+)$/, (match) => `已取消对 ${match[1]} 的编辑`],
    [/^Failed to add URL to allowlist:\s*(.+)$/, (match) => `将 URL 添加到允许名单失败：${match[1]}`],
    [/^Remove\s+(.+)$/, (match) => `移除 ${match[1]}`],
    // Permission modal regex pipeline (covering URL, Command, File, and MCP)
    [/^Save rule to always allow\s+([\s\S]+)\?$/i, (match) => `保存始终允许“${match[1]}”的规则吗？`],
    [/^Allow reading this URL\?$/i, () => '允许读取此 URL 吗？'],
    [/^Allow running this command\?$/i, () => '允许运行此命令吗？'],
    [/^Allow reading this file\?$/i, () => '允许读取此文件吗？'],
    [/^Allow editing this file\?$/i, () => '允许编辑此文件吗？'],
    [/^Allow\s+([\s\S]+)\?$/i, (match) => `允许“${match[1]}”吗？`],
    // 优先匹配带具体目标的权限规则 (R1 修复，保留动态命令/路径/工具名)
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+conversation$/i, (m) => `在本次对话中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+conversation$/i, (m) => `在本次对话中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+project$/i, (m) => `在本项目中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+project$/i, (m) => `在本项目中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+when\s+not\s+in\s+a\s+project$/i, (m) => `在非项目对话中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+when\s+not\s+in\s+a\s+project$/i, (m) => `在非项目对话中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+workspace$/i, (m) => `在此工作区中始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+in\s+this\s+workspace$/i, (m) => `在此工作区中保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"]|.+?)\s+globally$/i, (m) => `全局始终允许${formatRuleTarget(m[1])}`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"]|.+?)\s+globally$/i, (m) => `全局保存${formatRuleTarget(m[1])}的规则`],
    [/^Yes,\s*(?:and\s+)?always\s+allow(?:\s+for)?\s+(['"].+?['"])$/i, (m) => `始终允许${formatRuleTarget(m[1])}（全局）`],
    [/^Yes,\s*save\s+rule(?:\s+for)?\s+(['"].+?['"])$/i, (m) => `保存${formatRuleTarget(m[1])}的规则（全局）`],
    // 无具体目标的简写保底：
    [/^Yes,\s*allow(?:\s+this\s+time)?$/i, () => '仅本次允许'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+in\s+this\s+conversation$/i, () => '本次对话始终允许'],
    [/^Yes,\s*save\s+rule\s+in\s+this\s+conversation$/i, () => '在本次对话中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+in\s+this\s+project$/i, () => '本项目中始终允许'],
    [/^Yes,\s*save\s+rule\s+in\s+this\s+project$/i, () => '在本项目中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+when\s+not\s+in\s+a\s+project$/i, () => '非项目对话中始终允许'],
    [/^Yes,\s*save\s+rule\s+when\s+not\s+in\s+a\s+project$/i, () => '在非项目对话中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow\s+in\s+this\s+workspace$/i, () => '此工作区中始终允许'],
    [/^Yes,\s*save\s+rule\s+in\s+this\s+workspace$/i, () => '在此工作区中保存规则'],
    [/^Yes,\s*(?:and\s+)?always\s+allow$/i, () => '所有项目和对话中始终允许'],
    [/^Yes,\s*save\s+rule$/i, () => '全局保存规则'],
    [/^No\s*\([\s\S]*\)$/i, () => '否（告诉代理改做什么）'],
    [/^Skip\s*\([\s\S]*\)$/i, () => '跳过'],
    [/^Send feedback as (.+)$/, (match) => `以 ${match[1]} 的身份发送反馈`],
    [/^Cancel \((.+)\)$/, (match) => `取消（${match[1]}）`],
    [/^Select modes, current:\s*(.+)$/, (match) => `选择模式，当前：${match[1]}`],
    [/^Install (.+)$/, (match) => `安装 ${match[1]}`],
    [/^Open (.+) skill$/, (match) => `打开 ${match[1]} 技能`],
    [/^\+(\d+) attachments$/, (match) => `另有 ${match[1]} 个附件`],
    [/^Unmount workspace (.+)$/, (match) => `取消挂载工作区 ${match[1]}`],
    [/^Delete workspace (.+)$/, (match) => `删除工作区 ${match[1]}`],
    [/^Environment:\s*(.+)$/, (match) => `环境：${match[1]}`],
    [/^Updated\s+(\d+\s+(?:seconds?|minutes?|hours?|days?)\s+ago|just now|today|yesterday)$/i, (match) => `更新于 ${translateDuration(match[1]).replace(/\s+ago$/i, "前").replace(/^just now$/i, "刚刚").replace(/^today$/i, "今天").replace(/^yesterday$/i, "昨天")}`],
    [/^(\d+)\s*(s|m|h|d|w|mo|y)\s+ago$/i, (m) => {
      const n = m[1];
      const unit = (m[2] || '').toLowerCase();
      const map = { s: '秒', m: '分钟', h: '小时', d: '天', w: '周', mo: '个月', y: '年' };
      return `${n} ${map[unit] || unit}前`;
    }],
    [/^just now$/i, () => '刚刚'],
    [/^today$/i, () => '今天'],
    [/^yesterday$/i, () => '昨天'],
    [/^(Updated|Created|Edited|Modified)\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)$/i, (match) => {
      const map = { Updated: '更新于', Created: '创建于', Edited: '编辑于', Modified: '修改于' };
      return `${map[match[1]] || '更新于'} ${match[2]}`;
    }],
    [/^(Updated|Created|Edited|Modified)\s+(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})$/i, (match) => {
      const map = { Updated: '更新于', Created: '创建于', Edited: '编辑于', Modified: '修改于' };
      return `${map[match[1]] || '更新于'} ${match[2]}`;
    }],
    [/^Models within this group:\s*(.+)$/, (match) => `此组包含的模型：${match[1]}`],
    [/^Are you sure you want to mark all (\d+) conversations as read\? This action cannot be undone\.$/, (match) => `确定要将全部 ${match[1]} 个对话标记为已读吗？此操作无法撤销。`],
    [/^You have (\d+) conversations in progress\. Updating will interrupt them, and they will automatically resume once the update completes\.$/, (match) => `当前有 ${match[1]} 个对话正在进行。更新会将其中断，并在更新完成后自动恢复。`],
    [/^You have (\d+) conversations in progress\. Updating will cancel them and you'll need to manually restart them\.$/, (match) => `当前有 ${match[1]} 个对话正在进行。更新会将其取消，之后需要手动重新启动。`],
    [/^There was an error determining the code changes that this undo action will make:\s*(.+)$/, (match) => `无法确定此次撤销会造成哪些代码更改：${match[1]}`],
    // Labels that the app builds as `Label ${shortcut}` in one template string,
    // e.g. `Send message ${Q}` where Q is "Enter" or "↵". The label alone is a
    // dictionary entry, but the concatenated form never matches a lookup, so it
    // needs a rule of its own. The shortcut token is kept verbatim.
    [/^(Send message|Queue message|Send immediately)\s+(Enter|Alt\+Enter|Shift\+Enter|Ctrl\+Enter|Cmd\+Enter|⌘\+Enter|⌥\+Enter|↵|⌥↵|⏎)$/,
      (match) => `${translateValue(match[1])} ${match[2]}`],
    [/^(Record Audio|Stop Recording|Send message|Queue message)\s+(Ctrl\+[A-Za-z]|Alt\+[A-Za-z]|Shift\+[A-Za-z]|Cmd\+[A-Za-z]|⌘[A-Za-z]|⌥[A-Za-z])$/,
      (match) => `${translateValue(match[1])} ${match[2]}`],
    // Git 成功通知中的动态分支说明 (R7 修复)
    [/^Committed to (.+)\.$/i, (m) => `已提交到 ${m[1]}。`],
    [/^Amended commit on (.+)\.$/i, (m) => `已修改 ${m[1]} 上的提交。`],
    // 账号数量、方案限定提示与凭据名称 (R8 修复)
    [/^(\d+)\s+accounts$/i, (m) => `${m[1]} 个账号`],
    [/^Secret for (.+)$/i, (m) => `${m[1]} 的凭据`],
    [/^For (.+) accounts, this setting is disabled\.$/i, (m) => `${m[1]} 账号无法更改此设置。`],
    // 侧边面板入口卡片说明整句保底 (R6 辅助)
    [/^Stream and control\s+(.+)\s+directly in the side pane\.$/i, (m) => `在侧边面板中实时查看和控制 ${m[1]}。`],
    // 日志空状态保底 (R4 辅助)
    [/^No logs available\.?$/i, () => "暂无可用日志。"],
    // 会话计数模式
    [/^(\d+)\s+active\s+conversations?(?:\s+and\s+(\d+)\s+archived\s+conversations?)?(\.)?$/i, (m) => {
      const active = `${m[1]} 个活跃对话`;
      return (m[2] ? `${active}和 ${m[2]} 个已归档对话` : active) + (m[3] ? '。' : '');
    }],
    [/^(\d+)\s+archived\s+conversations?(\.)?$/i, (m) => `${m[1]} 个已归档对话${m[2] ? '。' : ''}`],
    // 通用兜底：界面文案 + 快捷键/计数括号。官方大量提示把快捷键或数量写在括号里
    // （Clear search (Esc)、Reset zoom (0)、Select Environment (Ctrl+.)、Tool Calls (5)…）；
    // 词典里通常只有不带括号的文案，这里保留括号内容、只翻译已知文案。
    [/^([\s\S]{2,120}?)\s*\((Esc|Enter|Shift\+Enter|Ctrl\+\S+|⌘\S*|⌃\S*|Space|Tab|\d+)\)$/, (m) => {
      const base = m[1].trim();
      const hit = translations.get(base) || translations.get(base.replace(/\s+/g, " "));
      return hit ? `${hit}（${m[2]}）` : m[0];
    }],
    // 通用兜底：状态/错误行「已知文案: 值」。官方大量运行状态与错误消息是
    // `Label: value` 形式（Code search: "x"、Opened browser: url、Failed to load trajectory: err…），
    // 词典只有标签本身，这里翻译标签、原样保留值。
    ...reviewedUiTemplateRules.filter(rule => rule.fallback),
    [/^([A-Za-z][A-Za-z0-9 +/&'-]{2,60}): ([\s\S]+)$/, (m) => {
      const hit = translations.get(m[1].trim());
      return hit ? `${hit}：${m[2]}` : m[0];
    }],
  ];



  regexTranslations.unshift(
    [/^Playback speed ([\d.]+)x$/, m => `播放速度 ${m[1]} 倍`],
    [/^(Mute|Unmute|Fullscreen|Exit fullscreen) \(([mf])\)$/, m => `${translations.get(m[1])}（${m[2]}）`],
    [/^Zoom ([\d.]+)%, reset to fit$/, m => `缩放 ${m[1]}%，重置为适合窗口`],
    [/^Unfold lines (\d+)-(\d+)$/, m => `展开第 ${m[1]}–${m[2]} 行`],
    [/^Available AI Credits: (.+)$/, m => `可用 AI 积分：${m[1]}`],
    [/^More actions for (.+)$/, m => `${m[1]} 的更多操作`],
    [/^Configure (.+)$/, m => `配置 ${m[1]}`],
    [/^The (.+) MCP server requires configuration parameters before it can be started\.$/, m => `${m[1]} MCP 服务器需要配置参数后才能启动。`],
    [/^Agents created by this (.+) run in a dedicated (project|workspace|environment) with its own permissions\. You can change the permissions in the \2 settings page\.$/, m => `此${m[1] === 'plugin' ? '插件' : m[1]}创建的智能体在专用${translations.get(m[2][0].toUpperCase() + m[2].slice(1)) || m[2]}中运行，拥有独立权限。你可以在对应的设置页面更改权限。`],
    [/^(Enabled|Started|Restarted) "(.+)"\.$/, m => `${({Enabled:'已启用',Started:'已启动',Restarted:'已重启'})[m[1]]}“${m[2]}”。`],
    [/^A file already exists at (.+)\.$/, m => `${m[1]} 处已存在文件。`],
    [/^The folder “(.+)” does not exist\. Would you like to create it\?$/, m => `文件夹“${m[1]}”不存在。是否创建？`],
    [/^Setting up WSL: (.+)$/, m => `正在设置 WSL：${m[1]}`],
    [/^Installing into (.+?)(?:…|\.{3})$/, m => `正在安装到 ${m[1]}…`],
    [/^(\d+) seconds of (\d+) seconds$/, m => `${m[1]} 秒 / 共 ${m[2]} 秒`],
    [/^(\d+:\d+(?::\d+)?) of (\d+:\d+(?::\d+)?)$/, m => `${m[1]} / ${m[2]}`],
    [/^Wait for (\d+)s$/, m => `等待 ${m[1]} 秒`]
  );
  const translatableAttributes = ["aria-label", "aria-valuetext", "placeholder", "data-placeholder", "title", "alt", "data-tooltip"];
  const opaqueSelector = "script, style, code, pre, [data-antigravity-user-content='true'], " +
    ".monaco-editor .view-lines, .xterm-screen, .line-content, .token, " +
    ".rounded-xl.border.overflow-hidden.p-4.font-mono.text-sm.leading-relaxed, " +
    "[data-testid='breadcrumb-segment'], [data-testid='settings-nav-item-Account'], " +
    "[data-testid='commentable-content'] .leading-relaxed.select-text, " +
    "[data-testid='setup-script-output'], [data-testid='agent-embed'], " +
    ".cursor-edit.group.relative.text-secondary-foreground.pl-2, [data-testid='run-command-step'] .font-mono";
  // These identifiers come from Antigravity 2.18.1's renderer. UI buttons inside
  // a message stay translatable; authored prose, names and tool output do not.
  const conversationSelector = "[data-testid='user-input-step'], [data-testid='planner-response-text'], " +
    "[data-testid='pending-user-messages'], [role='article'][aria-label='User message'], " +
    "[role='article'][aria-label='用户消息'], [role='article'][aria-label='Agent response'], " +
    "[role='article'][aria-label='智能体回复']";
  const uiSelector = "button, [role='button'], [role='menuitem'], [data-antigravity-ui='true'], " +
    "[data-testid='cascade-system-message-toolbar'], [data-testid='idle-status-text'], " +
    "[data-testid='turn-cards-container'] .files-changed-header, " +
    "label, [role='radio'], [role='checkbox'], [role='option'], [role='listbox'], " +
    "[data-testid$='-step'], [data-testid='agent-loading'], .animate-shimmer-text, [data-testid$='-collapsible'], " +
    "[data-testid$='-collapsible-trigger'], [data-testid='running-items-panel'], " +
    ".group.flex.w-full.min-w-0.items-center, [class*='select-none'][class*='min-h-8']";
  // 会话行标题属于用户内容：2.23.0 的行 testid 是动态的 `conversation-row-${kind}`，
  // 固定在 `conversation-row-history` 上会让这层保护整段失效；标题 span 的类名
  // 在 2.23.0 仍保留 truncate / inline-block / text-left 三个类。
  // 模型名同理属于专名：2.23.0 的模型选择器把“模型名 + 推理档位”拆成两个文本节点
  // （`Gemini 3.8 Flash` + `High`），档位词命中词条 High=高 会渲染成
  // “Gemini 3.8 Flash 高”，与 aria 标签不一致，因此整块模型名视为 identity。
  // 档位选项菜单（model-selector-effort-option，即 Low/Medium/High/Extra/Max 的列表）
  // 与模型名是同一套标识，按用户要求同样保持英文。
  const identitySelector = 'a[href^="/c/"], [data-testid^="conversation-row-"] span.truncate.inline-block.text-left, ' +
    '[data-testid="model-selector-trigger"] span.min-w-0.overflow-hidden.text-ellipsis.whitespace-nowrap, ' +
    '[data-testid="model-selector-effort-group"], ' +
    '[data-testid="model-selector-effort-option"], ' +
    '[data-testid="model-selector-panel"] span.shrink-0.opacity-70.text-xs';

  // fY/hY/jY in the 2.21.1 renderer: admit only application status headers,
  // never an entire step/article. hY's second span contains filenames/tool data.
  const statusHeaderSelector = '.group.flex.w-full.min-w-0.items-center.min-h-8.py-1.px-2.select-none';
  const statusTitleSelector = '.flex.flex-row.items-center.gap-1.overflow-hidden.whitespace-nowrap.text-muted-foreground';
  const statusControlSelector = 'button[data-testid="thinking-collapsible-trigger"], button[data-testid="tool-group-collapsible"]';
  const authoredStatusExclusion = "[data-testid='user-input-step'], [data-testid='pending-user-messages'], " +
    "[data-testid='planner-response-text'], [data-antigravity-user-content], " +
    "[role='article'][aria-label='User message'], [role='article'][aria-label='用户消息'], " +
    '.cursor-edit.group.relative.text-secondary-foreground.pl-2, pre, code, .xterm-screen, input, textarea, [contenteditable="true"]';
  // Authored bodies (plan / agent response text, user messages, thought prose).
  // Their text is model- or user-written, so it is never UI chrome.
  const authoredContentSelector = "[data-testid='user-input-step'], [data-testid='planner-response-text'], " +
    "[data-testid='pending-user-messages'], [data-antigravity-user-content], " +
    "[role='article'][aria-label='User message'], [role='article'][aria-label='用户消息'], " +
    '.cursor-edit.group.relative.text-secondary-foreground.pl-2';
  // The only controls that legitimately live inside a message body: the code
  // block actions and the input toolbar buttons. Everything else found inside an
  // authored body (even a fabricated thinking/tool-group button) stays content.
  const messageBodyControlSelector = ".user-input-buttons-container button, " +
    "button[aria-label='Copy code'], button[aria-label='Insert in terminal'], " +
    "button[aria-label='At mention code block']";
  const statusVerbs = Object.freeze({
    exploring: '正在探索', explored: '已探索', editing: '正在编辑', edited: '已编辑',
    running: '正在运行', ran: '已运行', analyzing: '正在分析', analyzed: '已分析',
    searching: '正在搜索', searched: '已搜索', reading: '正在读取', read: '已读取',
    checking: '正在检查', checked: '已检查', creating: '正在创建', created: '已创建',
    viewing: '正在查看', viewed: '已查看', writing: '正在写入', wrote: '已写入',
    browsing: '正在浏览', browsed: '已浏览', listing: '正在列出', listed: '已列出',
    killing: '正在终止', killed: '已终止', invoking: '正在调用', invoked: '已调用',
    // 2.22.0 渲染层 prefix 词表里出现、但此前未覆盖的动作（构建/测试/执行等）
    building: '正在构建', built: '已构建', testing: '正在测试', tested: '已测试',
    executing: '正在执行', executed: '已执行', asking: '正在询问', asked: '已询问',
    scrolling: '正在滚动', scrolled: '已滚动', retrieving: '正在获取', retrieved: '已获取',
    run: '运行',
  });
  const statusNouns = Object.freeze({
    file: '文件', files: '文件', artifact: '成果', artifacts: '成果', workspace: '工作区',
    command: '命令', commands: '命令', task: '任务', tasks: '任务', folder: '文件夹', folders: '文件夹',
    search: '搜索', searches: '搜索', page: '页面', pages: '页面', browser: '浏览器', browsers: '浏览器',
    subagent: '子代理', subagents: '子代理',
    content: '内容', outline: '大纲', resource: '资源', resources: '资源', 'task log': '任务日志',
  });
  function statusRegion(element) {
    if (!element || element.closest(authoredStatusExclusion)) return null;
    return element.closest(statusControlSelector + ', ' + statusHeaderSelector);
  }
  function statusPayload(element) {
    if (!statusRegion(element)) return false;
    const title = element.closest(statusTitleSelector);
    if (!title) return false;
    const prefix = title.firstElementChild;
    // hY can omit its prefix. Structured content (vB file/URI components)
    // still remains data when it is the first span rather than the second.
    if (prefix?.matches('span.inline-flex.text-muted-foreground')) return prefix.contains(element);
    if (!prefix?.matches('span.text-muted-foreground:not(.truncate):not(.inline-flex)')) return false;
    const payload = prefix.nextElementSibling;
    return Boolean(payload && payload.contains(element));
  }
  function elapsedStatus(value) {
    if (!value || value.length > 256) return null;
    const match = value.trim().match(/^(Thought|Thinking)\s+for\s+(.+?)([\s›❯>⌄▾▼]*)$/i);
    if (!match) return null;
    const duration = match[2], units = {h:'小时',hr:'小时',hrs:'小时',m:'分钟',min:'分钟',mins:'分钟',s:'秒',sec:'秒',secs:'秒'};
    const token = /\s*(\d+(?:\.\d+)?)\s*(hrs|hr|h|mins|min|m|secs|sec|s)/iy;
    const parts = []; let offset = 0;
    while (offset < duration.length) {
      token.lastIndex = offset;
      const part = token.exec(duration);
      if (!part) return null;
      parts.push(`${part[1]} ${units[part[2].toLowerCase()]}`);
      offset = token.lastIndex;
    }
    return `${match[1].toLowerCase() === 'thinking' ? '正在思考' : '已思考'} ${parts.join(' ')}${match[3]}`;
  }
  function translateStatusLabel(value) {
    if (!value) return value;
    const core = value.trim(), leading = value.match(/^\s*/)?.[0] || '', trailing = value.match(/\s*$/)?.[0] || '';
    const elapsed = elapsedStatus(core);
    if (elapsed) return leading + elapsed + trailing;
    const fixed = {'Retrieving Browser Pages':'正在获取浏览器页面','Retrieved Browser Pages':'已获取浏览器页面','Semantic searching':'正在进行语义搜索','Semantic searched':'已完成语义搜索'};
    if (Object.hasOwn(fixed, core)) return leading + fixed[core] + trailing;
    if (/^(Thinking|Thought Process|Working|Done|Unknown (?:file )?edit|Analyz(?:ing|ed) (?:Task Log|content)|Check(?:ing|ed) command status|Fetch(?:ing|ed) network requests?(?: for page\.)?|Extract(?:ing|ed) DOM elements|Failed to (?:build|edit|execute|read)|Test failed|(?:Searching|Searched) Moma for|(?:Retrieving|Retrieved) findings for|Build Cleaner (?:is running on|completed for)|(?:Auto-)?proceeded with|(?:reading|read) page|bookmarking|bookmarked|removing bookmark|removed bookmark|canceled (?:bookmark of|removal of bookmark|creation of|deletion of|edit to))$/i.test(core) && translations.has(core))
      return leading + translations.get(core) + trailing;
    const single = core.match(/^([A-Za-z]+)$/);
    if (single && statusVerbs[single[1].toLowerCase()]) return leading + statusVerbs[single[1].toLowerCase()] + trailing;
    // pqb includes a raw command only for a single Running/Ran segment. Preserve
    // every character after that verb, including commas, quotes and Unicode.
    const command = core.match(/^(Running|Ran)\s+([\s\S]+)$/i);
    if (command && !/^commands?[\s›❯>⌄▾▼]*$/i.test(command[2]))
      return leading + statusVerbs[command[1].toLowerCase()] + ' ' + command[2] + trailing;
    const summary = core.replace(/[\s›❯>⌄▾▼]+$/, '').split(/,\s*/);
    if (summary.length > 1 && summary.every(part => /^(Exploring|Explored|Running|Ran|Editing|Edited|Building|Built|Testing|Tested|Executing|Executed|Reading|Read|Analyzing|Analyzed|Searching|Searched|Creating|Created)\s+(files?|artifacts?|commands?)$/i.test(part))) {
      const translated = summary.map(part => { const [verb, noun] = part.toLowerCase().split(/\s+/); return statusVerbs[verb] + statusNouns[noun]; });
      const marker = core.match(/[\s›❯>⌄▾▼]+$/)?.[0] || '';
      return leading + translated.join('，') + marker + trailing;
    }
    const action = core.match(/^([A-Za-z]+)(?:\s+([\s\S]+))?$/);
    const verb = action && statusVerbs[action[1].toLowerCase()];
    if (!verb) {
      // Known static status text is safe; arbitrary tool summaries are data.
      if (/^(Thinking|Thought Process|Working|Done|Unknown (?:file )?edit|Analyz(?:ing|ed) Task Log)$/i.test(core)) return translateValue(value);
      return value;
    }
    const tail = action[2];
    if (!tail) return leading + verb + trailing;
    const count = tail.match(/^(\d+)\s+(files?|artifacts?|commands?|tasks?|folders?|searches?|pages?|browsers?|subagents?|resources?)(?=$|[\s:：])([\s\S]*)$/i);
    if (count) {
      const noun = count[2].toLowerCase(), measure = /^search/.test(noun) ? '次' : '个';
      return leading + verb + ' ' + count[1] + ' ' + measure + statusNouns[noun] + count[3] + trailing;
    }
    const noun = tail.match(/^(task log|files?|artifacts?|workspace|commands?|tasks?|folders?|searches?|pages?|browsers?|subagents?|content|outline|resources?)(?=$|[\s:：])([\s\S]*)$/i);
    if (noun && statusNouns[noun[1].toLowerCase()]) return leading + verb + statusNouns[noun[1].toLowerCase()] + noun[2] + trailing;
    // A file/command/task name is not passed back through the dictionary.
    return leading + verb + ' ' + tail + trailing;
  }
  function translateElapsedContainer(element) {
    const region = statusRegion(element);
    if (!region?.matches('button[data-testid="thinking-collapsible-trigger"]')) return false;
    const original = originalElementText(region);
    const translated = elapsedStatus(original);
    if (!translated) return false;
    const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT);
    const nodes = []; let node;
    while ((node = walker.nextNode())) nodes.push(node);
    // Preserve React's nodes and callbacks; count/unit fragments may be separate
    // nodes and may arrive later. WeakMap originals also preserve live updates.
    nodes.forEach((text, index) => writeText(text, index === 0 ? translated : '', originalText(text)));
    return true;
  }

  // Antigravity 2.21.1 never emits the data-antigravity-ui attribute: 0 occurrences in
  // the renderer bundle and 0 in the official app.asar. Keying the exemption off that
  // phantom marker left every agent-article control classified as model output, which is
  // why Worked for / Copy / Copy code / Review / relative times stayed English. The old
  // attribute is kept as a harmless legacy fallback; the selectors below are the real
  // 2.21.1 anchors that actually match.
  const conversationUiSelector = "[data-antigravity-ui='true'], .user-input-buttons-container button, " +
    "[data-testid='cascade-system-message-toolbar'], " +
    "button[data-testid='thinking-collapsible-trigger'], button[data-testid='tool-group-collapsible'], " +
    "button[data-testid='worked-for-collapsible'], " +
    "button[aria-label='Copy code'], button[aria-label='Insert in terminal'], " +
    "button[aria-label='At mention code block'], " +
    "[data-testid='turn-cards-container'] .files-changed-header, " +
    "[data-testid='running-items-panel'] button";
  function isOpaque(element) {
    if (element?.closest('.group\\/agent-ref, [aria-label^="Open Subagent:"]')) return true;
    if (isProjectIdentity(element)) return true;
    if (statusPayload(element)) return true;
    const root = element?.closest(opaqueSelector);
    // Only the fixed home segment on the customizations route is UI text.
    // User paths, editable conversation titles and subsequent plugin names stay opaque.
    if (root?.matches('[data-testid="breadcrumb-segment"]') &&
        /^\/customizations(?:\/|$)/.test(location.pathname) &&
        root === document.querySelector('[data-testid="breadcrumb-segment"]') &&
        !root.querySelector('input, [contenteditable="true"]') &&
        originalElementText(root).trim() === 'Customizations') return false;
    // 日志空状态占位提示并非真实日志，特例放行 (R4 修复)
    // The sidecar log panel renders its empty placeholder as a bare <pre> inside an
    // app-owned container. Real log lines share that element, so the exemption is
    // scoped to the container plus the exact placeholder string.
    if (root?.matches('pre') && root.closest("[data-testid='sidecar-logs-content']") &&
        root.childElementCount === 0 && root.textContent?.trim() === "No logs available.") return false;
    // Code block action buttons (like Copy code) are UI controls, not code characters.
    const codeControl = element?.closest("button[aria-label='Copy code'], button[aria-label='Insert in terminal'], button[aria-label='At mention code block']");
    if (root?.matches('pre, code') && codeControl && root.contains(codeControl)) return false;
    // Only the application's gutter control is UI; every code character stays opaque.
    if (root?.matches('.line-content') && root.closest('.file-viewer-root') &&
        !root.closest('pre, code, [data-antigravity-user-content], [data-testid="agent-embed"]') &&
        (element === root || element.closest('button[data-testid="gutter-comment-button"]'))) return false;
    // Visit only terminal input metadata; screen rows and all terminal text stay protected.
    if (root?.matches('.xterm-screen') && element.matches('.xterm-screen, .xterm-helpers, textarea.xterm-helper-textarea')) return false;
    return Boolean(root);
  }
  function isConversationContent(element) {
    const root = element?.closest(conversationSelector);
    if (!root) return false;
    if (statusRegion(element)) return false;
    // Authored text wins over control identity: a status or toolbar control that
    // merely appears inside a message body is content, not chrome.
    if (element.closest(authoredContentSelector)) {
      const bodyControl = element.closest(messageBodyControlSelector);
      return !(bodyControl && root.contains(bodyControl));
    }
    const control = element.closest(conversationUiSelector);
    return !(control && control !== root && root.contains(control));
  }
  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    // New MCP panes concatenate a fixed prefix, an app-supplied title and
    // diagnostic text. Only the first text node is application UI.
    if (parent?.closest('[data-testid="mcp-app-pane-loading"], [data-testid="mcp-app-pane-error"]')) {
      const firstText = [...parent.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
      if (node !== firstText || !['Loading', 'Could not load'].includes(originalText(node)?.trim())) return true;
    }
    return !parent || isOpaque(parent) || Boolean(parent.closest('.xterm-screen')) || parent.isContentEditable ||
      Boolean(parent.closest('.line-content') && !parent.closest('button[data-testid="gutter-comment-button"]')) ||
      Boolean(parent.closest("textarea, input")) || isConversationContent(parent) ||
      Boolean(parent.closest(identitySelector));
  }
  function translateValue(value) {
    if (!value) return value;
    if (translationCache.has(value)) return translationCache.get(value);
    const core = value.trim();
    const leading = value.match(/^\s*/)?.[0] || "";
    const trailing = value.match(/\s*$/)?.[0] || "";
    let result = value;
    if (themePresetNames.has(core) || diffSourceNames.has(core) || ['Artifact', 'Schedule', 'Prompt'].includes(core)) return value;
    const normalizedCore = core.replace(/\s+/g, " ");
    if (translations.has(core)) result = leading + translations.get(core) + trailing;
    else if (translations.has(normalizedCore)) result = leading + translations.get(normalizedCore) + trailing;
    else if (core.length <= 2048 && !(/^(?:Thought|Thinking|Worked|Stopped)\b/i.test(core) && core.length > 256)) for (const [pattern, replacement] of regexTranslations) {
      const match = core.match(pattern);
      if (match) { result = leading + replacement(match) + trailing; break; }
    }
    if (translationCache.size < MAX_CACHE_ENTRIES) translationCache.set(value, result);
    return result;
  }
  function originalText(node) {
    const saved = nodeOriginals.get(node);
    if (saved && node.nodeValue === saved.applied) return saved.original;
    if (saved) nodeOriginals.delete(node);
    return node.nodeValue;
  }
  function writeText(node, value, original = originalText(node)) {
    if (value === original) nodeOriginals.delete(node);
    else nodeOriginals.set(node, { original, applied: value });
    if (node.nodeValue !== value) node.nodeValue = value;
  }
  const reviewedFragments = new Set([
    '', 's', ').', 'space).', 'Agents created by', 'this plugin', 'run in a dedicated', 'project', 'workspace', 'environment',
    'two', 'three', 'insertion', 'deletion', 'lint error',
    'Commit', 'file', 'files', 'change', 'changes', 'to', 'need', 'needs', 'input',
    'more', 'less', 'line', 'lines', '… (', 'above hidden)', 'above hidden', '...and',
    'Review', 'comment', 'comments', 'subagent', 'subagents', 'updated',
    'plugin', 'plugins', 'image', 'images', 'result', 'results', 'finding', 'findings',
    'question', 'questions', 'page', 'pages', 'of', 'partial:', 'steps loaded',
    'navigate', 'select', 'close', 'for', 'or',
    'A', 'with this name already exists.', 'This', 'is managed by the',
    'automation and can only be deleted by deleting that automation.'
  ]);
  function translateReviewedUiFragment(node) {
    const original = originalText(node), core = original?.trim();
    if (!reviewedFragments.has(core) && !/^\d+s?$/.test(core)) return false;
    const parent = node.parentElement;
    const outer = originalElementText(parent.parentElement).replace(/\s+/g, ' ');
    let translated;
    if (/^\d+ (?:insertions?|deletions?|lint errors?)(?: \([+-]\))?$/.test(originalElementText(parent))) {
      const fragments = { insertion: '行新增', deletion: '行删除', 'lint error': '个代码检查错误', s: '' };
      if (Object.hasOwn(fragments, core)) {
        writeText(node, original.replace(core, fragments[core]), original); return true;
      }
    }
    if (/^Wait for \d+s$/.test(outer)) {
      if (core === 's') translated = original.replace('s', ' 秒');
      else if (/^\d+s$/.test(core)) translated = original.replace(/^(\d+)s$/, '$1 秒');
    }
    const sentence = originalElementText(parent).replace(/\s+/g, ' ');
    const context = sentence.startsWith('Agents created by ') || sentence.startsWith('Select one of the ') ? sentence : outer;
    if (core === ').' && sentence.startsWith('Intended primarily for previewing local development servers'))
      translated = original.replace(').', '）。');
    if (context.startsWith('Agents created by ') && context.includes(' run in a dedicated')) {
      const fragments = {'Agents created by':'由','this plugin':'此插件','run in a dedicated':'创建的智能体在专用的',project:'项目',workspace:'工作区',environment:'环境'};
      if (fragments[core]) translated = original.replace(core, fragments[core]);
    }
    if (context.startsWith('Select one of the ') && context.includes('options. Agent settings')) {
      if (core === 'two' || core === 'three') translated = original.replace(core, core === 'two' ? '两项' : '三项');
    }
    if (/^Commit \d+ files? changes? to$/.test(sentence)) {
      const count = sentence.match(/^Commit (\d+)/)[1];
      const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT); let part, first = true;
      while ((part = walker.nextNode())) { writeText(part, first ? `将 ${count} 个文件的更改提交到` : '', originalText(part)); first = false; }
      return true;
    }
    if (/^\d+ needs? input$/.test(sentence)) {
      const fragments = { need: '项需要', needs: '项需要', s: '', input: '输入' };
      if (Object.hasOwn(fragments, core)) translated = core === 'input' ? '输入' : original.replace(core, fragments[core]);
    }
    if (/^\+\d+ more lines?$/.test(sentence)) {
      const fragments = { more: '更多', line: '行', lines: '行' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (/^\.\.\. \d+ lines?$/.test(sentence) && parent.matches('[data-testid^="folded-badge-"]')) {
      if (core === 'line' || core === 'lines') translated = original.replace(core, '行');
    }
    if (/^(?:… \()?\d+ lines? above hidden\)?$/.test(sentence)) {
      const fragments = { '… (': '…（', line: '行', lines: '行', 'above hidden)': '上方内容已隐藏）', 'above hidden': '上方内容已隐藏' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (/^\.\.\.and \d+ more$/.test(sentence)) {
      const fragments = { '...and': '...另有', more: '项' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (/^Review \d+ comments?$/.test(sentence)) {
      const fragments = { Review: '审阅', comment: '条评论', comments: '条评论', s: '' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (/^\(\d+ subagents?\)$/.test(sentence)) {
      const fragments = { subagent: '个子代理', subagents: '个子代理', s: '' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (/^\d+ files? updated$/.test(sentence)) {
      const fragments = { file: '个文件', files: '个文件', updated: '已更新' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (/^\d+ (?:plugins?|images?|results?|findings?|questions?|pages?)$/.test(sentence)) {
      const fragments = { plugin: '个插件', plugins: '个插件', image: '张图片', images: '张图片', result: '个结果', results: '个结果', finding: '项发现', findings: '项发现', question: '个问题', questions: '个问题', page: '个页面', pages: '个页面', s: '' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (/^\d+ of \d+$/.test(sentence) && core === 'of') {
      translated = original.replace('of', '/');
    }
    if (/^partial: [\d,]+ of [\d,]+ steps loaded$/.test(sentence)) {
      const fragments = { 'partial:': '部分加载：已加载', of: '/', 'steps loaded': '步' };
      if (Object.hasOwn(fragments, core)) translated = original.replace(core, fragments[core]);
    }
    if (parent.matches('span') && parent.querySelector(':scope > kbd')) {
      const kbdLabels = { navigate: '导航', select: '选择', close: '关闭' };
      if (Object.hasOwn(kbdLabels, core)) translated = original.replace(core, kbdLabels[core]);
    }
    if (core === 'for' && parent.matches('span.text-xs.text-muted-foreground.shrink-0') && node === parent.firstChild && /^for\s+\S/.test(sentence)) {
      translated = original.replace('for', '来自');
    }
    if (core === 'or' && sentence.startsWith('Many external websites (such as Google Search')) {
      translated = original.replace('or', '或');
    }
    if (core === 'space).' && sentence.startsWith("This step's invocation metadata is not available")) {
      translated = original.replace('space).', '）。');
    }
    if (/^A (?:project|workspace) with this name already exists\.$/.test(sentence)) {
      const fragments = { A: '使用此名称的', project: '项目', workspace: '工作区', 'with this name already exists.': '已存在。' };
      if (Object.hasOwn(fragments, core)) translated = fragments[core];
    }
    if (/^This (?:project|workspace) is managed by the .+ automation and can only be deleted by deleting that automation\.$/.test(sentence)) {
      const fragments = { This: '此', project: '项目', workspace: '工作区', 'is managed by the': '由 ', 'automation and can only be deleted by deleting that automation.': ' 自动化任务管理，只能通过删除该自动化任务来删除。' };
      if (Object.hasOwn(fragments, core)) translated = fragments[core];
    }
    if ((core === 'less' || core === 'more') && parent.matches('button') && ['Collapse string', 'Expand long string'].includes(originalAttribute(parent, 'title'))) {
      translated = original.replace(core, core === 'less' ? '收起' : '展开');
    }
    if (translated === undefined) return false;
    writeText(node, translated, original); return true;
  }
  function translateTextNode(node) {
    if (node.parentElement?.closest('[data-antigravity-zh-detail-view]')) return;
    if (shouldSkipTextNode(node)) { restoreNode(node); return; }
    const parent = node.parentElement;
    if (translateDetailText(node)) return;
    if (translatePermissionSentence(node)) return;
    if (translateReviewedPluginBlock(parent)) return;
    if (translateReviewedUiFragment(node)) return;
    if (translatePlatformUi(node)) return;
    if (translateSkillAndPluginCard(node)) return;
    if (translateElapsedContainer(parent)) return;
    translateOnboardingContainer(parent);
    if (translateArchivedNotification(parent)) return;
    if (translatePluginMarkdownContent(parent)) return;
    if (parent.childNodes.length > 1 && translateSplitNoPhrase(parent)) return;
    const original = originalText(node);
    // A bare "No" inside a split sentence is not a yes/no response.
    if (original?.trim() === "No" && !parent.closest("button, label, [role='button'], [role='option']")) return;
    const status = statusRegion(parent);
    const title = status && parent.closest(statusTitleSelector);
    let translated = status && (title || status.matches(statusControlSelector)) ? translateStatusLabel(original) : translateValue(original);
    const core = original?.trim();
    if (parent.matches('span') && /^Permanently delete\s/.test(originalElementText(parent))) {
      if (core === ', including') translated = original.replace(core, '，包含');
      if (core === '.') translated = original.replace('.', '。');
    }
    translated = translateOnboardingFragment(parent, original, translated);
    translated = translateScheduledText(parent, original, translated);
    // 侧边面板入口前后片段翻译 (R6 修复)
    if (core === "Stream and control") translated = original.replace(core, "在侧边面板中实时查看和控制");
    if (core === "directly in the side pane.") translated = original.replace(core, "。");
    if (/^(\d+)\s+subagents?$/i.test(core)) translated = original.replace(/^(\d+)\s+subagents?$/i, '$1 个子代理');
    if ((core === 'subagents' || core === 'subagent') && (node.previousSibling || parent.closest(statusHeaderSelector))) translated = original.replace(core, '个子代理');
    if ((core === 'project' || core === 'workspace') && isDeleteConfirmation(parent)) translated = original.replace(core, core === 'project' ? '项目' : '工作区');
    if (core === 'Artifact' && parent.closest('[aria-label="Artifact Viewer header"], [aria-label="成果查看器标题栏"]')) translated = original.replace(core, translations.get(core) || core);
    const fileTab = parent.closest('button[data-tab-id^="file__"]');
    if (fileTab) translated = translateFileTabLabel(fileTab, original);
    else if (parent.closest('[data-testid="diff-source-label"]')) translated = translateDiffSourceLabel(original);
    if (themePresetNames.has(core) && isThemePresetControl(parent) && translations.has(core)) translated = original.replace(core, translations.get(core));
    const screen = settingsScreen(parent);
    if (core === "Type" && parent.closest('[data-testid="plan-command-fyi-alert"]')) translated = original.replace("Type", "输入");
    if (core === "Plan" && parent.matches('h3') && screen === "Models & Usage") translated = original.replace("Plan", "订阅方案");
    if (screen === "Conversations" && core === "when working in this project.") translated = "（用于非项目对话）。";
    if (parent.matches('.markdown-alert-title') || parent.closest('.markdown-alert-title')) {
      const alertMap = { 'NOTE': '注意', 'TIP': '提示', 'IMPORTANT': '重要', 'WARNING': '警告', 'CAUTION': '小心' };
      if (alertMap[core]) translated = original.replace(core, alertMap[core]);
    }
    if (parent.matches('title')) translated = original.replace(/ - Outside of Project - Antigravity$/, " - 项目之外 - Antigravity");
    writeText(node, translated, original);
    const themeControl = parent.closest('[role="combobox"], [role="option"]');
    if (themeControl && (themePresetNames.has(core) || elementOriginals.get(themeControl)?.get('title')?.themePreset)) updateThemePresetTooltip(themeControl);
  }
  function settingsScreen(element) {
    const wrapper = element.closest('.p-6.flex.flex-col.gap-4, .p-4.flex.flex-col.gap-4');
    const heading = wrapper?.querySelector('h2');
    if (!heading) return null;
    return originalElementText(heading);
  }
  function originalElementText(element) {
    if (!element) return '';
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let text = '', node;
    while ((node = walker.nextNode())) text += originalText(node);
    return text.trim();
  }
  function translatePermissionSentence(node) {
    const core = originalText(node)?.trim();
    if (!['','Also includes','Global Permissions','when working','in this project','in these conversations','.','Learn more'].includes(core)) return false;
    let parent = node.parentElement;
    for (let depth = 0; parent && depth < 3; depth++, parent = parent.parentElement) {
      const sentence = originalElementText(parent).replace(/\s+/g, ' ').trim();
      const match = sentence.match(/^Also includes Global Permissions when working (in this project|in these conversations)\.(?: Learn more\.)?$/);
      if (!match) continue;
      const context = match[1] === 'in this project' ? '在此项目中' : '在这些对话中';
      const fragments = {'Also includes':`${context}工作时，也会应用`,'Global Permissions':'全局权限','when working':'','in this project':'','in these conversations':'','.':'。','Learn more':'了解更多'};
      const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT); let text;
      while ((text = walker.nextNode())) {
        const original = originalText(text), key = original.trim();
        if (Object.hasOwn(fragments, key)) writeText(text, fragments[key], original);
        else if (!key) writeText(text, '', original);
      }
      return true;
    }
    return false;
  }
  function translatePlatformUi(node) {
    const original = originalText(node), core = original?.trim(), parent = node.parentElement;
    if (!core) return false;
    let translated;
    if (['Keep In Menu Bar','Keep the app accessible from the menu bar and running in the background when all windows are closed.'].includes(core) &&
        /Win/.test(navigator.platform) && settingsScreen(parent) === 'Application')
      translated = core === 'Keep In Menu Bar' ? '保留在系统托盘' : '所有窗口关闭后，仍可从系统托盘访问应用并保持后台运行。';
    if (/^.+ (Weekly|Daily|5-hour) Limit$/.test(core) && settingsScreen(parent) === 'Models & Usage')
      translated = core.replace(/ (Weekly|Daily|5-hour) Limit$/, (_, period) => ` ${{Weekly:'每周额度',Daily:'每日额度','5-hour':'五小时额度'}[period]}`);
    if (/^(\d+)([mhd])$/.test(core) && parent.closest('nav[aria-label="Sidebar"], nav[aria-label="侧边栏"]') && !parent.closest('a, button'))
      translated = core.replace(/^(\d+)([mhd])$/, (_, n, u) => `${n} ${{m:'分钟',h:'小时',d:'天'}[u]}前`);
    if (translated === undefined) return false;
    writeText(node, translated, original); return true;
  }
  function translateOnboardingFragment(parent, original, translated) {
    const core = original.trim();
    // 接收推广邮件复选框跨节点处理 (R5 修复)
    if (parent.matches("label, span, div") && originalElementText(parent).includes("Yes, I'd like to receive product updates, tips, and promotions from Google")) {
      const parts = {
        "Yes, I'd like to receive product updates, tips, and promotions from Google": "我愿意接收 Google ",
        " via email.": " 的产品更新、使用技巧和推广邮件。",
        "via email.": "的产品更新、使用技巧和推广邮件。",
      };
      if (parts[core]) return original.replace(core, parts[core]);
    }
    if (parent.matches('p') && originalText(parent.firstChild)?.trim().startsWith('Plugins are packaged collections')) {
      const raw = originalElementText(parent).replace(/\s+/g, ' ');
      if (raw === 'Plugins are packaged collections of skills and MCPs to help the Agent in Antigravity work with Google developer products. You can always change your choices in Settings.') {
        const parts = {
          'Plugins are packaged collections of skills and MCPs to help the Agent': '插件将技能与 MCP 工具打包，帮助代理',
          'in Antigravity': '在 Antigravity 中',
          'Plugins are packaged collections of skills and MCPs to help the Agent in': '插件将技能与 MCP 工具打包，帮助',
          'Antigravity': 'Antigravity 中的代理',
          'work with Google developer products. You can always change your choices in Settings.': '使用 Google 开发者产品。你可以随时在设置中更改选择。',
        };
        if (parts[core]) return original.replace(core, parts[core]);
      }
    }
    if (parent.matches('span') && parent.querySelector('a[href="https://antigravity.google/terms"]') &&
        parent.querySelector('a[href="https://policies.google.com/privacy"]') &&
        originalElementText(parent).startsWith('Yes, I agree to help improve Antigravity by allowing Google')) {
      const parts = {
        'Yes, I agree to help improve': '是的，我同意帮助改进',
        'by allowing Google to collect and use my Interactions data, subject to the': '，允许 Google 收集和使用我的交互数据，并遵守',
        'and': '和',
        '. I understand I can choose to opt out later whenever I want via my settings.': '。我了解以后可以随时在设置中选择退出。',
      };
      if (parts[core]) return original.replace(core, parts[core]);
    }
    return translated;
  }
  function translateOnboardingContainer(element) {
    const paragraph = element.closest('p');
    let consent = element.closest('span');
    while (consent && !consent.querySelector('a[href="https://antigravity.google/terms"]')) consent = consent.parentElement?.closest('span');
    for (const parent of [paragraph, consent]) {
      if (!parent || isOpaque(parent) || isConversationContent(parent) || parent.isContentEditable) continue;
      // Rescan only these known split UI sentences when a later fragment arrives.
      const prefix = parent.firstChild?.nodeType === Node.TEXT_NODE ? originalText(parent.firstChild).trim() : '';
      if (!prefix.startsWith('Plugins are packaged collections') && !prefix.startsWith('Yes, I agree to help improve') && !prefix.startsWith("Yes, I'd like to receive product updates")) continue;
      for (const node of parent.childNodes) if (node.nodeType === Node.TEXT_NODE) {
        const original = originalText(node);
        writeText(node, translateOnboardingFragment(parent, original, translateValue(original)), original);
      }
    }
  }
  function localizeProjectTutorial(element) {
    const card = element.closest('[data-testid="nux-card"]');
    if (!card || card.querySelector('[data-antigravity-zh-project-guide]') || isConversationContent(card) || isOpaque(card)) return;
    const title = card.querySelector('.text-base.font-medium.text-foreground');
    if (originalElementText(title) !== 'Creating a Project') return;
    const media = Array.from(card.children).find(child => child.matches('img, video'));
    if (!media) return;
    const guide = document.createElement('div');
    guide.setAttribute('data-antigravity-zh-project-guide', 'true');
    guide.setAttribute('role', 'img');
    guide.setAttribute('aria-label', '创建项目：在项目列表中点击加号，选择新建项目，然后填写项目信息。');
    guide.style.cssText = 'padding:24px 20px;background:var(--secondary);color:var(--foreground);font:14px/1.6 system-ui,sans-serif;';
    const heading = document.createElement('div'); heading.textContent = '创建你的第一个项目';
    heading.style.cssText = 'font-size:18px;font-weight:600;margin-bottom:16px;'; guide.append(heading);
    for (const text of ['① 在侧边栏找到“项目”，点击旁边的 ＋', '② 选择“新建项目”', '③ 填写项目信息，点击“创建项目”']) {
      const step = document.createElement('div'); step.textContent = text;
      step.style.cssText = 'padding:8px 12px;margin-top:8px;border:1px solid var(--border);border-radius:8px;background:var(--background);';
      guide.append(step);
    }
    const original = originalAttribute(media, 'style'); media.style.display = 'none';
    writeAttribute(media, 'style', media.getAttribute('style'), original);
    card.insertBefore(guide, media); controller.removables.add(guide);
  }
  function originalAttribute(element, attribute) {
    const current = element?.getAttribute(attribute);
    const record = elementOriginals.get(element)?.get(attribute);
    return record && current === record.applied ? record.original : current;
  }
  function isDeleteConfirmation(element) {
    return /^Delete (Project|Workspace)$/.test(originalElementText(element.closest('[role="dialog"]')?.querySelector('h2')));
  }
  function scheduledDialog(element) {
    const dialog = element.closest('[role="dialog"]');
    return dialog?.querySelector('[data-testid="new-sidecar-modal"]') ? dialog : null;
  }
  function scheduledContainer(element) {
    return scheduledDialog(element) ||
      element.closest('[data-testid="schedule-editor-panel"], [data-testid="cloud-trigger-editor-panel"], [data-testid="trigger-option-selector"]') ||
      (element.closest('[role="listbox"]') && document.querySelector('[data-testid="schedule-editor-panel"], [data-testid="cloud-trigger-editor-panel"], [data-testid="schedule-frequency-trigger"]'));
  }
  function translateScheduledText(parent, original, translated) {
    const core = original.trim();
    if (core === 'Prompt' && parent.matches('div.text-muted-foreground.text-sm.mb-0\\.5, h6.uppercase.tracking-wider')) {
      return original.replace(core, translations.get(core) || core);
    }
    const container = scheduledContainer(parent);
    const summaryEl = parent.matches('span.font-semibold') ? parent.parentElement : parent;
    const isScheduleSummary = summaryEl?.matches?.('span') && /^(?:Daily around|Weekly on [A-Za-z]+ around) \d{1,2}:\d{2} (?:AM|PM)$/.test(originalElementText(summaryEl).replace(/\s+/g, ' '));
    if (!container && !isScheduleSummary) return translated;
    if (core === 'Schedule' || core === 'Prompt') return original.replace(core, translations.get(core) || core);
    if (core === 'around') return original.replace(core, '约在');
    if (core === 'on') {
      const frequency = container?.querySelector?.('[data-testid="schedule-frequency-trigger"]')?.getAttribute('data-frequency');
      return original.replace(core, frequency === 'custom' ? '规则' : '在');
    }
    // React splits this fixed sentence into three text nodes. Keep that structure.
    if (/^All (scheduled task|automation)s run as Flash\.$/.test(originalElementText(parent))) {
      const parts = {'All':'所有', 'scheduled task':'定时任务', 'automation':'自动化任务', 's run as Flash.':'均使用 Flash 模型运行。'};
      if (parts[core]) return parts[core];
    }
    const time = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(core);
    if (time && (isScheduleSummary || parent.closest('[role="combobox"], [role="option"]'))) {
      const hour = Number(time[1]) % 12 + (time[3] === 'PM' ? 12 : 0);
      return original.replace(core, `${String(hour).padStart(2, '0')}:${time[2]}`);
    }
    return translated;
  }
  function isProjectIdentity(element) {
    if (!element) return false;
    const nav = element.closest('[data-testid^="settings-nav-item-"]');
    if (nav && /^(Projects?|Workspaces?)$/.test(originalElementText(nav.parentElement?.previousElementSibling?.querySelector('h2')))) return true;
    if (element.matches('span') && ['Edit project name', 'Edit workspace name'].includes(originalAttribute(element.parentElement?.querySelector(':scope > button[aria-label]'), 'aria-label'))) return true;
    const strong = element.closest('strong');
    if (strong) {
      const first = strong.parentElement.firstChild;
      // Only the name in the confirmation question is user content. The next
      // paragraph also uses strong, but contains a translatable conversation count.
      // Protect descendants too: a project name can be wrapped in a nested span.
      if ((first?.nodeType === Node.TEXT_NODE && originalText(first).trim() === 'Permanently delete' &&
           strong === strong.parentElement.querySelector(':scope > strong')) ||
          (isDeleteConfirmation(strong) && first?.nodeType === Node.TEXT_NODE &&
           /^Are you sure you want to delete the(?:\s+(?:project|workspace))?\s*$/.test(originalText(first)))) return true;
    }
    // The scheduled-task selector shows the user's project names, including names
    // that happen to equal dictionary keys. Its popup is portalled into the dialog.
    if (element.matches('span.truncate:not(.text-muted-foreground)')) {
      const dialog = scheduledDialog(element);
      const modal = dialog?.querySelector('[data-testid="new-sidecar-modal"]');
      const label = modal && [...modal.querySelectorAll('label')].find(e => originalElementText(e) === 'Project');
      const picker = label?.parentElement.querySelector('[role="combobox"]');
      if (picker && (picker.contains(element) || element.closest('[role="listbox"]')?.id === `${picker.id}-list`)) return true;
    }
    return false;
  }
  function isThemePresetControl(element) {
    const control = element.closest('[role="combobox"], [role="option"]');
    if (!control) return false;
    if (control.matches('[role="combobox"]')) return settingsScreen(control) === 'Appearance';
    const listbox = control.closest('[role="listbox"]');
    return Boolean(listbox?.id && [...document.querySelectorAll('[role="combobox"][aria-controls]')]
      .some(trigger => trigger.getAttribute('aria-controls') === listbox.id && settingsScreen(trigger) === 'Appearance'));
  }
  function translateDiffSourceLabel(value) {
    return value.replace(/^(\s*)\(?([^()]+)\)?(\s*)$/, (full, leading, source, trailing) => {
      if (!diffSourceNames.has(source) || !translations.has(source)) return full;
      const text = translations.get(source);
      return leading + (value.trim().startsWith('(') ? `（${text}）` : text) + trailing;
    });
  }
  function translateFileTabLabel(tab, value) {
    const uri = tab.getAttribute('data-tab-id').slice(6);
    let name;
    try { name = decodeURIComponent(new URL(uri).pathname.split('/').pop()); } catch { return value; }
    for (const source of diffSourceNames) {
      if (translations.has(source) && value === `${name} (${source})`) return `${name}（${translations.get(source)}）`;
    }
    return value;
  }
  function updateThemePresetTooltip(element) {
    if (!element.matches('[role="combobox"], [role="option"]')) return;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let raw = '', node;
    while ((node = walker.nextNode())) raw += originalText(node);
    raw = raw.trim();
    const current = element.getAttribute('title');
    const saved = elementOriginals.get(element);
    const record = saved?.get('title');
    if (themePresetNames.has(raw) && isThemePresetControl(element) && translations.has(raw)) {
      writeAttribute(element, 'title', `原名：${raw}`, record && current === record.applied ? record.original : current);
      const next = elementOriginals.get(element)?.get('title');
      if (next) { next.literal = true; next.themePreset = true; }
    } else if (record?.themePreset) {
      if (current === record.applied) {
        if (record.original === null) element.removeAttribute('title');
        else element.setAttribute('title', record.original);
      }
      saved.delete('title');
      if (!saved.size) elementOriginals.delete(element);
    }
  }
  function translateArchivedNotification(element) {
    const paragraph = element.closest('p');
    const toast = paragraph?.closest('[data-testid="toast-notification"][data-notification-tag^="archive-conversation-"], [data-testid="toast-notification"][data-notification-tag="archive-project-success"]');
    if (!toast || isOpaque(paragraph) || isConversationContent(paragraph)) return false;
    const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
    const nodes = []; let node;
    while ((node = walker.nextNode())) nodes.push(node);
    if (!nodes.length) return false;
    const flat = nodes.map(originalText).join('').replace(/\s+/g, ' ').trim();
    const link = paragraph.querySelector('a[href="notification://history"]');
    // 2.23.0 归档提示正文：markdown 内联图标让首节点变成 "View archived in the sidebar ("，
    // 整句无法命中词典，必须在结构层改写首尾节点（中间是图标，保持 React 节点不动）。
    if (!link && /^View archived in the sidebar \(.*menu\)\.$/.test(flat)) {
      nodes.forEach((text, index) => writeText(text,
        index === 0 ? '在侧边栏查看已归档项（' : index === nodes.length - 1 ? ' 菜单）。' : '', originalText(text)));
      return true;
    }
    if (!link) return false;
    if (flat !== 'View archived conversations in history.') return false;
    const start = nodes.findIndex(node => link.contains(node));
    const end = nodes.findLastIndex(node => link.contains(node));
    if (start <= 0 || end >= nodes.length - 1) return false;
    // Preserve the existing anchor and React nodes, including its click handler.
    nodes.forEach((node, index) => writeText(node,
      index === 0 ? '已归档的对话可在' : index === start ? '历史记录' : index === end + 1 ? '中查看。' : '', originalText(node)));
    return true;
  }

  function translateSkillAndPluginCard(nodeOrEl) {
    if (!nodeOrEl) return false;
    // 文本节点处理
    if (nodeOrEl.nodeType === Node.TEXT_NODE) {
      const parent = nodeOrEl.parentElement;
      if (!parent || isOpaque(parent) || isConversationContent(parent)) return false;
      const raw = originalText(nodeOrEl);
      if (!raw || raw.length < 5) return false;
      const core = raw.trim();
      const collapsed = core.replace(/\s+/g, ' ');
      const match = allOfficialSkillsMap[core] || allOfficialSkillsMap[collapsed] || translations.get(core) || translations.get(collapsed);
      if (match) {
        writeText(nodeOrEl, raw.replace(core, match), raw);
        if (parent.hasAttribute('title')) {
          const titleVal = parent.getAttribute('title');
          const titleCore = titleVal ? titleVal.trim() : '';
          const titleCollapsed = titleCore.replace(/\s+/g, ' ');
          if (titleCore === core || titleCollapsed === collapsed || titleCore === raw) {
            writeAttribute(parent, 'title', match, titleVal);
          }
        }
        return true;
      }
      // 前缀快速命中 (针对超长多行段落)
      if (core.length > 35) {
        const pfx = core.slice(0, 35);
        for (const [enKey, zhVal] of Object.entries(allOfficialSkillsMap)) {
          if (enKey.startsWith(pfx) || enKey.replace(/\s+/g, ' ').startsWith(pfx)) {
            writeText(nodeOrEl, zhVal, raw);
            if (parent.hasAttribute('title')) {
              writeAttribute(parent, 'title', zhVal, parent.getAttribute('title'));
            }
            return true;
          }
        }
      }
      return false;
    }
    // 元素处理 (比如包含多个文本节点或者具有 title 属性的卡片容器)
    if (nodeOrEl instanceof Element) {
      if (isOpaque(nodeOrEl) || isConversationContent(nodeOrEl)) return false;
      // 检查 title 属性
      if (nodeOrEl.hasAttribute('title')) {
        const titleVal = nodeOrEl.getAttribute('title');
        const core = titleVal ? titleVal.trim() : '';
        const collapsed = core.replace(/\s+/g, ' ');
        const match = allOfficialSkillsMap[core] || allOfficialSkillsMap[collapsed] || translations.get(core) || translations.get(collapsed);
        if (match) {
          writeAttribute(nodeOrEl, 'title', match, titleVal);
        }
      }
      // 检查是否为技能卡片或模态框描述容器
      if (nodeOrEl.matches('span.text-sm.text-muted-foreground.truncate, p.text-sm.text-muted-foreground.leading-relaxed, div.text-xs.text-muted-foreground.truncate, [data-testid="doc-row-modal"] p')) {
        const flat = originalElementText(nodeOrEl);
        if (flat && flat.length >= 10) {
          const core = flat.trim();
          const collapsed = core.replace(/\s+/g, ' ');
          const match = allOfficialSkillsMap[core] || allOfficialSkillsMap[collapsed] || translations.get(core) || translations.get(collapsed);
          if (match) {
            const walker = document.createTreeWalker(nodeOrEl, NodeFilter.SHOW_TEXT);
            const first = walker.nextNode();
            if (first) {
              writeText(first, match, originalText(first));
              let next;
              while ((next = walker.nextNode())) writeText(next, '', originalText(next));
            }
            if (nodeOrEl.hasAttribute('title')) {
              writeAttribute(nodeOrEl, 'title', match, nodeOrEl.getAttribute('title'));
            }
            return true;
          }
        }
      }
    }
    return false;
  }

  function translateReviewedPluginBlock(element) {
    const target = element?.closest('p, td, li, h1, h2, h3, h4, h5, h6, blockquote, div.markdown-alert');
    if (!target?.closest('.leading-relaxed.select-text') || target.closest('[data-testid="doc-row-modal"]') ||
        isOpaque(target) || isConversationContent(target)) return false;
    // Never let an older outer-list/alert rule erase reviewed child paragraphs.
    if (target.querySelector('p, li')) {
      let handled = false;
      for (const child of target.querySelectorAll('p, li')) if (!child.querySelector('p, li') && reviewedReadmeBlocks.has(originalElementText(child).replace(/\s+/g, ' ').trim())) handled = translateReviewedPluginBlock(child) || handled;
      if (handled) return true;
    }
    const source = originalElementText(target).replace(/\s+/g, ' ').trim();
    const reviewed = reviewedReadmeBlocks.get(source);
    if (reviewed) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT), nodes = []; let node;
      while ((node = walker.nextNode())) nodes.push(node);
      if (nodes.length !== reviewed.original.length || nodes.some((n, i) => originalText(n).replace(/\s+/g, ' ').trim() !== reviewed.original[i])) return false;
      nodes.forEach((n, i) => writeText(n, reviewed.translated[i], originalText(n)));
      return true;
    }
    if (!/^(?:The google-cloud-developer plugin equips|This plugin bundles curated Agent Skills|finding-google-skills: Discovery|Equip your agent with current SDK patterns|Build applications with the Interactions API|Build low-latency, bidirectional voice|gemini-api-docs \(|API key: Set the GEMINI_API_KEY|GitHub Repository \(|"Generate multi-speaker dialogue audio|"Migrate src\/ from client\.models\.generate_content)/.test(source)) return false;
    const fragments = {
      'The':'',
      'plugin equips Antigravity with foundational skills, safety guardrails, and live documentation grounding for building on Google Cloud.':' 插件为 Antigravity 提供在 Google Cloud 上开发所需的基础技能、安全防护措施和实时文档依据。',
      'This plugin bundles curated Agent Skills, routing rules, and configuration for the':'此插件将精选的智能体技能、路由规则，以及 ',
      'Developer Knowledge MCP server':'Developer Knowledge MCP 服务器',
      'into a single portable package.':' 的配置整合为一个便携式套件。',
      ': Discovery and on-demand installation of specialized skills from the Google Agent Skills repo.':'：从 Google Agent Skills 仓库发现并按需安装专业技能。',
      'Equip your agent with current SDK patterns, model identifiers, and live documentation lookup for building applications with the':'为智能体提供最新的 SDK 用法、模型标识和实时文档检索，帮助其使用 ',
      'Build applications with the':'使用 ',
      '. Covers text generation, stateful multi-turn chat, streaming, function calling, structured output, image generation, speech generation (TTS), Voice Design, Voice Replication, managed agents, Deep Research, and migrations from':' 构建应用。涵盖文本生成、有状态多轮对话、流式传输、函数调用、结构化输出、图像生成、语音合成（TTS）、声音设计、声音克隆、托管代理、深度研究，以及迁移旧版 ',
      'Build low-latency, bidirectional voice and video applications over WebSockets with the':'通过 WebSocket 和 ',
      '. Covers real-time audio/video streaming, background reasoning (extended thinking), asynchronous non-blocking tool calls, real-time transcription, live speech translation, and session management.':' 构建低延迟、双向语音和视频应用。涵盖实时音视频流、后台深度推理、异步非阻塞工具调用、实时听写、实时语音翻译与会话管理。',
      '): Provides':'）：提供 ',
      'and':' 和 ',
      'so your agent can search and read official Gemini API documentation directly without manual URL fetching.':'，让智能体直接搜索和阅读官方 Gemini API 文档，无需手动获取 URL。',
      'API key':'API 密钥',
      ': Set the':'：设置 ',
      'environment variable with a key from':' 环境变量，密钥可从 ',
      'GitHub Repository (':'GitHub 代码仓库（',
      '"Generate multi-speaker dialogue audio using the latest Gemini TTS models and':'“使用最新的 Gemini TTS 模型及 ',
      'annotations."':' 注解生成多说话人对话音频。”',
      '"Migrate':'“将 ',
      'from':' 中使用的 ',
      'to':' 迁移至 ',
      '."':'。”',
      '.':source.startsWith('API key:') ? ' 获取。' : source.startsWith('Equip your agent') ? ' 构建应用。' : '。',
      '(':'（',
      ')':'）'
    };
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) {
      const original = originalText(node), core = original.replace(/\s+/g, ' ').trim();
      // Also restore names and code that an older block rewrite blanked out.
      const translated = !node.parentElement.closest('code,pre') && Object.hasOwn(fragments, core) ? fragments[core] : original;
      writeText(node, translated, original);
    }
    return true;
  }
  function translatePluginMarkdownContent(element) {
    if (!element || isOpaque(element) || isConversationContent(element)) return false;
    if (translateReviewedPluginBlock(element)) return true;
    const target = element.closest('td, li, p, div.markdown-alert, blockquote, dd, dt, h1, h2, h3, h4, h5, h6');
    if (!target) return false;
    const flatOriginal = originalElementText(target);
    if (!flatOriginal) return false;

    function writeBlockText(el, text) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      const first = walker.nextNode();
      if (first) {
        writeText(first, text, originalText(first));
        let next;
        while ((next = walker.nextNode())) writeText(next, '', originalText(next));
      }
    }

// --- Google Cloud Developer Deep Screen Fixes ---
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim().toLowerCase() === 'what\'s included') {
      writeBlockText(target, '包含内容');
      return true;
    }
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim().toLowerCase() === 'bundled skills') {
      writeBlockText(target, '内置技能');
      return true;
    }
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim().toLowerCase() === 'mcp server') {
      writeBlockText(target, 'MCP 服务器');
      return true;
    }
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim().toLowerCase() === 'routing rules') {
      writeBlockText(target, '路由规则');
      return true;
    }
    if (flatOriginal.includes('The `google-cloud-developer` plugin equips Antigravity') || (flatOriginal.includes('google-cloud-developer') && flatOriginal.includes('equips Antigravity with foundational skills'))) {
      writeBlockText(target, 'google-cloud-developer 插件为 Antigravity 配备了在 Google Cloud 上构建应用所需的基础技能、安全防护栏以及实时官方文档检索能力。');
      return true;
    }
    if (flatOriginal.includes('This plugin bundles curated Agent Skills, routing rules') || (flatOriginal.includes('bundles curated Agent Skills') && flatOriginal.includes('Developer Knowledge MCP server'))) {
      writeBlockText(target, '该插件将精选的智能体技能、路由规则以及 Developer Knowledge MCP 服务器配置整合为一个便携式套件。');
      return true;
    }
    if (flatOriginal.includes('gcloud') && flatOriginal.includes('Safety-critical validation, best practices') && (flatOriginal.includes('execution guardrails') || flatOriginal.includes('gcloud CLI commands'))) {
      writeBlockText(target, 'gcloud：针对 gcloud CLI 命令的关键安全验证、最佳实践与执行防护栏。');
      return true;
    }
    if (flatOriginal.includes('google-cloud-recipe-auth') && (flatOriginal.includes('Authentication workflows') || flatOriginal.includes('credential selection'))) {
      writeBlockText(target, 'google-cloud-recipe-auth：身份验证工作流、凭据选择与服务身份最佳实践。');
      return true;
    }
    if (flatOriginal.includes('google-cloud-recipe-onboarding') && (flatOriginal.includes('First-project onboarding') || flatOriginal.includes('billing configuration'))) {
      writeBlockText(target, 'google-cloud-recipe-onboarding：首个项目快速上手、账号设置与结算配置。');
      return true;
    }
    if (flatOriginal.includes('retrieving-developer-knowledge') && flatOriginal.includes('Grounded retrieval of official Google documentation')) {
      writeBlockText(target, 'retrieving-developer-knowledge：基于事实检索 Google 官方开发者文档。');
      return true;
    }

    if (flatOriginal.includes('finding-google-skills') || (flatOriginal.includes('Google 技能') && flatOriginal.includes('Google Agent Skills repo'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('finding-google-skills') || t.includes('查找 Google 技能')) {
          writeText(n, '查找 Google 技能', t);
        } else if (t.includes('Discovery and on-demand installation') || t.includes('Google Agent Skills repo')) {
          writeText(n, '：从 Google Agent Skills 代码仓库中发现并按需安装专业技能。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Developer Knowledge MCP') && flatOriginal.includes('over streamable HTTP')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Developer Knowledge MCP server') || t.includes('Developer Knowledge MCP 服务')) {
          writeText(n, 'Developer Knowledge MCP 服务器', t);
        } else if (t.includes('Provides AI agents with up-to-date grounding') || t.includes('over streamable HTTP')) {
          writeText(n, '：通过流式 HTTP 为 AI 智能体提供官方 Google 开发者文档的最新佐证。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('google-cloud-discovery.md') && (flatOriginal.includes('Always-on routing map that guides the agent') || flatOriginal.includes('beyond the foundational bundle') || flatOriginal.includes('始终启用的路由图'))) {
      writeBlockText(target, 'google-cloud-discovery.md：始终启用的路由图，当任务需要超出基础套件的专业领域知识时，引导智能体发现并推荐更深入的特定产品技能（例如 gke-*、agent-platform-*、google-cloud-waf-* 以及 <product>-basics）。');
      return true;
    }
    if (flatOriginal.includes('To see how this plugin works') && (flatOriginal.includes('bootstrapping a new project') || flatOriginal.includes('working on a script') || flatOriginal.includes('google-cloud-developer'))) {
      writeBlockText(target, '为了了解该插件的工作原理，请设想一种场景：您正在为编写脚本初始化一个新项目。安装 google-cloud-developer 插件后，您可以向智能体提出如下提示：');
      return true;
    }
    if (flatOriginal.includes("I'm brand new to this platform, and I need to get an account") || (flatOriginal.includes('我是这个平台的新手') && flatOriginal.includes('以服务身份而非我个人的身份调用'))) {
      writeBlockText(target, '我是这个平台的新手，需要设置一个账号以及配置好结算的首个项目。然后，我需要对本地计算机进行身份验证，以便我正在编写的脚本能够以服务身份而非我个人的身份调用 API。');
      return true;
    }
    if ((flatOriginal.includes('Environment awareness') || flatOriginal.includes('环境感知')) && (flatOriginal.includes('runs background checks against your live environment') || flatOriginal.includes('silently runs background checks') || flatOriginal.includes('CLI availability'))) {
      writeBlockText(target, '环境感知：智能体在后台静默核查您实际环境中的前置条件，例如 CLI 可用性以及潜在的现有项目或组织。');
      return true;
    }
    if ((flatOriginal.includes('Review') || flatOriginal.includes('审查评估')) && (flatOriginal.includes('IAM best practices') || flatOriginal.includes('accidental key leaks') || flatOriginal.includes('git commits'))) {
      writeBlockText(target, '审查评估：智能体充分考量 IAM 最佳实践，以规避提示中可能涉及的高危风险，例如密钥意外泄露或提交到 Git。');
      return true;
    }
    if ((flatOriginal.includes('Interaction with guardrails') || flatOriginal.includes('带防护栏的交互')) && (flatOriginal.includes('workflow roadmap') || flatOriginal.includes('modifying any resources') || flatOriginal.includes('before modifying'))) {
      writeBlockText(target, '带防护栏的交互：智能体列出工作流路线图，并在修改任何资源之前提供执行这些步骤的确认选项。');
      return true;
    }

    // --- Data Agent Kit Overview, Prerequisites, Config, Features & Prompts ---
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim().toLowerCase() === 'configuration') {
      writeBlockText(target, '配置');
      return true;
    }
    if (target.matches('h1, h2, h3, h4, h5, h6') && (flatOriginal.trim() === 'Features and Common Uses' || flatOriginal.trim() === 'Common use cases' || flatOriginal.trim() === 'Features')) {
      writeBlockText(target, '功能与常见用途');
      return true;
    }
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim().toLowerCase() === 'prerequisites') {
      writeBlockText(target, '前置要求');
      return true;
    }
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim().toLowerCase() === 'resources') {
      writeBlockText(target, '相关资源');
      return true;
    }

    if (flatOriginal.includes('Data Agent Kit') && (flatOriginal.includes('free plugin') || flatOriginal.includes('15+ Google Data Cloud services') || flatOriginal.includes('是一个 free plugin') || flatOriginal.includes('免费插件'))) {
      writeBlockText(target, 'Data Agent Kit 是一款免费插件，可将您的编码智能体连接至 15+ 项 Google Data Cloud 服务，涵盖 BigQuery、Cloud Storage、Spanner、AlloyDB、Managed Service for Apache Spark 以及 Knowledge Catalog。');
      return true;
    }
    if (flatOriginal.includes('Spend your time on insights, not boilerplate') && (flatOriginal.includes('heavy lifting for you') || flatOriginal.includes('Describe a data task'))) {
      writeBlockText(target, '将时间专注在业务洞见上，而非样板代码。只需用日常语言描述数据任务，智能体便可为您处理繁重的开发工作：编写 SQL 查询、构建笔记本、生成流水线代码、设置机器学习工作流等。');
      return true;
    }
    if (flatOriginal.includes('Node.js') && flatOriginal.includes('latest LTS recommended')) {
      writeBlockText(target, 'Node.js（推荐最新的 LTS 版本）。');
      return true;
    }
    if (flatOriginal.includes('Google Cloud CLI') && flatOriginal.includes('installed and authenticated')) {
      writeBlockText(target, 'Google Cloud CLI (gcloud)，已安装并完成身份验证：');
      return true;
    }
    if (flatOriginal.includes('Install the gcloud CLI')) {
      writeBlockText(target, '安装 gcloud CLI。');
      return true;
    }
    if (flatOriginal.includes('Log in with your Google Cloud account')) {
      writeBlockText(target, '使用您的 Google Cloud 账号登录：');
      return true;
    }
    if (flatOriginal.includes('Log in to') && (flatOriginal.includes('Application Default Credentials') || flatOriginal.includes('应用程序默认凭据') || flatOriginal.includes('(ADC)'))) {
      const prefixMatch = flatOriginal.match(/^(\d+\.\s*)/);
      const prefix = prefixMatch ? prefixMatch[1] : '';
      writeBlockText(target, prefix + '登录应用程序默认凭据 (ADC)：');
      return true;
    }
    if (flatOriginal.includes('Provide any prompt to your agent') && flatOriginal.includes('Data Agent Kit')) {
      writeBlockText(target, '向智能体提供任意提示，它将引导您完成 Data Agent Kit 的配置。');
      return true;
    }
    if (flatOriginal.includes('Alternatively, you can manually invoke') && flatOriginal.includes('Data Agent Kit setup skill')) {
      writeBlockText(target, '或者，您也可以手动调用 Data Agent Kit 设置技能：');
      return true;
    }
    if (flatOriginal.includes('Restart your agent when prompted to complete the setup')) {
      writeBlockText(target, '在收到提示时重启智能体以完成设置。');
      return true;
    }
    if (flatOriginal.includes('Data engineering') && (flatOriginal.includes('Build pipelines that turn source data') || flatOriginal.includes('analysis-ready tables'))) {
      writeBlockText(target, '数据工程：构建将原始数据转换为可供分析的数据表流水线，全程伴随质量检查。使用 dbt 或 Dataform 开发数据转换，使用 Managed Service for Apache Airflow 调度工作流，并通过追踪执行日志和代码排查运行失败问题。');
      return true;
    }
    if (flatOriginal.includes('Data science') && (flatOriginal.includes('Develop experiments in Jupyter notebooks') || flatOriginal.includes('Apache Spark kernels'))) {
      writeBlockText(target, '数据科学：在本地 Python 或远程 Managed Service for Apache Spark 内核上的 Jupyter 笔记本中开发实验。从 BigQuery 准备特征，使用 BigQuery ML 训练模型，并调度批量推理。');
      return true;
    }
    if (flatOriginal.includes('Data analysis') && (flatOriginal.includes('Explore data across BigQuery') || flatOriginal.includes('Knowledge Catalog'))) {
      writeBlockText(target, '数据分析：在 BigQuery、AlloyDB 和 Cloud SQL 中探索数据。借助数据质量指标和血缘在 Knowledge Catalog 中查找数据集，进而构建可视化图表或可重用的数据模型。');
      return true;
    }
    if (flatOriginal.includes('Data Agent Kit homepage')) {
      writeBlockText(target, 'Data Agent Kit 官方主页');
      return true;
    }
    if (flatOriginal.includes('Data Agent Kit documentation')) {
      writeBlockText(target, 'Data Agent Kit 官方文档');
      return true;
    }

    if (flatOriginal.includes('Create a PySpark notebook to train a distributed Random Forest model')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Create a PySpark notebook')) {
          writeText(n, '“创建一个 PySpark 笔记本，在 BigQuery 表 ', t);
        } else if (t.includes('my_transactions') && n.parentElement?.matches('code')) {
          writeText(n, 'my_transactions', t);
        } else if (t.includes('Random Forest model') || t.trim() === '"') {
          writeText(n, ' 上训练分布式随机森林模型”', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Find datasets about customer orders in Knowledge Catalog and show their lineage')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Find datasets about customer orders')) {
          writeText(n, '“在 Knowledge Catalog 中查找有关客户订单的数据集并显示其数据血缘”', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Create an Airflow DAG that runs the dedup notebook') && flatOriginal.includes('every Monday morning')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Create an Airflow DAG')) {
          writeText(n, '“创建一个 Airflow DAG，每周一早上运行去重笔记本、dbt 流水线和模型训练”', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('My last Dataflow job failed. Find the root cause in the logs and propose a fix')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('My last Dataflow job failed')) {
          writeText(n, '“我上次的 Dataflow 作业失败了。请在日志中找出根本原因并提出修复方案”', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('could not find default credentials') && (flatOriginal.includes('logged into gcloud') || flatOriginal.includes('auth errors'))) {
      writeBlockText(target, '如果您看到“找不到默认凭据”或其他身份验证错误，请确保您已登录 gcloud。');
      return true;
    }
    if (flatOriginal.includes('Exit your agent, run') && (flatOriginal.includes('restart your agent') || flatOriginal.includes('gcloud auth login'))) {
      writeBlockText(target, '退出智能体，依次运行 gcloud auth login 和 gcloud auth application-default login，然后重启智能体。');
      return true;
    }
    if (flatOriginal.includes('Your agent can run tools and commands on your behalf') && flatOriginal.includes('principle of least privilege')) {
      writeBlockText(target, '智能体可以代表您运行工具和命令。请对智能体可以访问的每个 CLI、MCP 服务器和资源应用最小权限原则：');
      return true;
    }
    if (flatOriginal.includes('Use service account impersonation instead of end-user credentials')) {
      writeBlockText(target, '使用服务账号模拟，而非最终用户凭据。');
      return true;
    }
    if (flatOriginal.includes('Grant the service account only the roles it needs')) {
      writeBlockText(target, '仅向服务账号授予其完成任务所需的最小角色。');
      return true;
    }
    if (flatOriginal.includes('Principal Access Boundary policies') && flatOriginal.includes('restrict your agent')) {
      writeBlockText(target, '使用包含策略绑定条件的主体访问边界 (PAB) 策略，将智能体的服务账号严格限制在目标项目内。');
      return true;
    }
    if (flatOriginal.includes('mitigate prompt injection risks with Google Cloud MCP')) {
      writeBlockText(target, '了解如何利用 Google Cloud MCP 防范提示词注入风险。');
      return true;
    }
    if (flatOriginal.includes('To opt out, either set') && flatOriginal.includes('DO_NOT_TRACK=1')) {
      writeBlockText(target, '若要选择停用，可以在环境中设置 DO_NOT_TRACK=1：');
      return true;
    }
    if (flatOriginal.includes('Or create or update') && flatOriginal.includes('.data_agent_kit/config.json')) {
      writeBlockText(target, '或者创建或更新 ~/.data_agent_kit/config.json：');
      return true;
    }
    if (flatOriginal.includes('We want your feedback') && (flatOriginal.includes('report bugs') || flatOriginal.includes('open an issue'))) {
      writeBlockText(target, '我们期待您的反馈！欢迎提交 Issue 报告错误、提出功能建议或咨询问题。');
      return true;
    }

    // Date table header
    if (target.matches('th, td') && flatOriginal.trim() === 'Date') {
      writeText(target, '日期', flatOriginal);
      return true;
    }
    // Google privacy link
    if (flatOriginal.includes('Google handles this data in accordance with the')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Google handles this data in accordance with the')) writeText(n, 'Google 将根据 ', t);
        else if (t.includes('Google Privacy Policy')) writeText(n, 'Google 隐私权政策', t);
        else if (t.includes('.')) writeText(n, ' 处理这些数据。', t);
      }
      return true;
    }


    // ==========================================
    // 1. Gemini API 全量接管
    // ==========================================
    // Gemini README uses the reviewed inline dictionary. Rewriting whole
    // blocks here duplicates split phrases and removes code/link text.

    // ==========================================
    // 2. Android CLI
    // ==========================================
    if (flatOriginal.includes('is the official command-line interface') && flatOriginal.includes('agent-first workflows')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('is the official command-line interface')) {
          writeText(n, ' 是官方提供的命令行界面，为以智能代理为中心的工作流标准化了核心 Android 开发能力。它为编程代理与开发者提供了高效开发 Android 所需的官方工具、技能和文档的统一入口。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Whether you are scaffolding a new app') && flatOriginal.includes('streamlines development directly from your workspace')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Whether you are scaffolding a new app')) {
          writeText(n, '无论是搭建新应用、启动虚拟设备、运行快速增量构建、检查实时设备布局，还是评估用户操作旅程，Android CLI 都能直接在工作区中简化开发流程。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Initialize modern Android projects from official templates') || (flatOriginal.includes('Initialize modern Android') && flatOriginal.includes('android create'))) {
      writeBlockText(target, '使用 android create 从官方模板初始化现代 Android 项目。');
      return true;
    }
    if (flatOriginal.includes('Pre-configured with the latest Android Gradle Plugin')) {
      writeBlockText(target, '预配置最新的 Android Gradle 插件 (AGP)、Jetpack Compose 以及行业最佳实践。');
      return true;
    }
    if (flatOriginal.includes('Inspect, create, and launch Android Virtual Devices') || (flatOriginal.includes('Android Virtual Devices') && flatOriginal.includes('android emulator'))) {
      writeBlockText(target, '直接在终端中检查、创建和启动 Android 虚拟设备 (AVD)，使用 android emulator。');
      return true;
    }
    if (flatOriginal.includes('Deploy and launch your app using fast') || (flatOriginal.includes('incremental builds with') && flatOriginal.includes('android run'))) {
      writeBlockText(target, '通过快速增量安装部署并启动应用程序，使用 android run。');
      return true;
    }
    if (flatOriginal.includes('android skills') && (flatOriginal.includes('official way to discover') || flatOriginal.includes('official discovery') || flatOriginal.includes('management for recommended skills') || flatOriginal.includes('提供了发现、安装') || flatOriginal.includes('manage recommended skills'))) {
      writeBlockText(target, 'android skills 命令提供了发现、安装、更新和管理推荐技能的官方途径。');
      return true;
    }
    if (flatOriginal.includes('Test end-to-end user flows with Journey tests') || (flatOriginal.includes('Journey tests') && flatOriginal.includes('android layout'))) {
      writeBlockText(target, '使用自然语言定义的旅程测试，结合 android layout 和视觉验证，测试端到端用户操作流程。');
      return true;
    }
    if (flatOriginal.includes('Output structured Markdown reports detailing pass/fail statuses')) {
      writeBlockText(target, '输出详细记录通过/失败状态、ADB 交互命令和验证屏幕截图的结构化 Markdown 报告。');
      return true;
    }
    if (flatOriginal.includes('Search authoritative, up-to-date Android developer documentation') || (flatOriginal.includes('Android developer documentation') && flatOriginal.includes('android docs search'))) {
      writeBlockText(target, '通过 android docs search "<query>" 直接在 CLI 中搜索权威、最新的 Android 开发者文档。');
      return true;
    }
    if (flatOriginal.includes('Fetch full articles and migration guides using') || (flatOriginal.includes('migration guides using') && flatOriginal.includes('android docs fetch'))) {
      writeBlockText(target, '使用 android docs fetch kb://... 获取完整技术文章与迁移指南。');
      return true;
    }
    if (flatOriginal.includes('If the android tool is not already in your PATH') && flatOriginal.includes('platform-specific installer')) {
      writeBlockText(target, '如果 android 工具尚未包含在您的 PATH 环境变量中，请使用适用于您平台的安装程序进行安装：');
      return true;
    }
    if (flatOriginal.includes('You must run') && flatOriginal.includes('android init') && (flatOriginal.includes('Antigravity to discover and use Android CLI') || flatOriginal.includes('discover and use Android CLI'))) {
      writeBlockText(target, '您必须运行 android init 才能让 Antigravity 发现并使用 Android CLI：');
      return true;
    }

    // ==========================================
    // 3. Modern Web Guidance
    // ==========================================
    if (flatOriginal.includes('is a set of skills that embed web platform expertise') && flatOriginal.includes('coding agents away from legacy patterns')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('is a set of skills that embed')) {
          writeText(n, ' 是一套将 Web 平台专业知识、最佳实践和浏览器兼容性数据直接嵌入编程智能体的技能集。它帮助引导编程智能体远离陈旧旧模式，转而采用充分利用现代 Web 平台强大功能与特性的解决方案。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Modern Web Guidance') && (flatOriginal.includes('preview release') || flatOriginal.includes('welcome contributions'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('This is a')) writeText(n, '这是现代 Web 开发指南的 ', t);
        else if (t.includes('preview release')) writeText(n, '预览版本', t);
        else if (t.includes('Modern Web Guidance') || t.includes('actively adding new content')) writeText(n, '。我们将持续添加新内容，并 ', t);
        else if (t.includes('welcome contributions')) writeText(n, '欢迎在 GitHub 上贡献或提供反馈', t);
        else if (t.trim() === '.') writeText(n, '。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Modern Web Guidance bridges this gap') || (flatOriginal.includes('Modern Web Guidance') && flatOriginal.includes('expert-curated guidelines'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Modern Web Guidance bridges this gap')) {
          writeText(n, '现代 Web 开发指南正是为了填补这一空白。', t);
        } else if (t.includes('returns targeted') || t.includes('expert-curated guidelines') || t.includes("Our skill's CLI") || t.includes("Our skill’s CLI")) {
          writeText(n, ' 我们技能的 CLI 将由专家精心策划的针对性指南直接返回到智能体的上下文窗口中，重点关注：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Modern Browser APIs') && flatOriginal.includes('frequently misuse')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Modern Browser APIs')) writeText(n, '现代浏览器 API', t);
        else if (t.includes('Helping models correctly structure')) writeText(n, '：帮助模型正确构建它们经常误用的 API。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Performance & Accessibility') && flatOriginal.includes('accessibility affordances')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Performance & Accessibility')) writeText(n, '性能与无障碍辅助', t);
        else if (t.includes('Preferring platform-level APIs')) writeText(n, '：优先选择可被浏览器优化并具备内置无障碍能力的平台级 API。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Responsible Fallbacks') && flatOriginal.includes('heavy polyfills')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Responsible Fallbacks')) writeText(n, '负责任的降级兜底', t);
        else if (t.includes('Guiding models to use sensible')) writeText(n, '：引导模型使用合理、轻量的降级兜底方案，而不是沉重的 Polyfill 或陈旧第三方库。', t);
      }
      return true;
    }
    // --- Modern Web Guidance: Safe Adoption & How It Works & Core Disciplines ---
    if (flatOriginal.includes('Progressive Enhancement & Nuanced Fallbacks') && (flatOriginal.includes('purely additive enhancements') || flatOriginal.includes('speculative preloading'))) {
      writeBlockText(target, '渐进式增强与精细化回退：我们区分纯粹附加的增强功能（如推测性预加载，较旧浏览器可以安全地静默忽略）与关键行为（如对话框控件或网络信标，我们编写了深思熟虑、低开销的兜底方案）。');
      return true;
    }
    if (flatOriginal.includes('Responsible Fallbacks') && (flatOriginal.includes('case-specific custom fallbacks') || flatOriginal.includes('heavy third-party bundles') || flatOriginal.includes('conditionally-loaded polyfills') || flatOriginal.includes('polyfil'))) {
      writeBlockText(target, '负责任的兜底方案：我们优先采用轻量级、针对特定场景的自定义兜底代码（<50 行），或按需加载的 polyfill，而非庞大的第三方依赖包。');
      return true;
    }
    if (flatOriginal.includes('Gotchas & Quirks') && (flatOriginal.includes('fetchLater') || flatOriginal.includes('hidden platform limitations') || flatOriginal.includes('scrollbar behaviors'))) {
      writeBlockText(target, '平台陷阱与特殊细节：我们记录了隐藏的平台限制，例如 fetchLater() 的 64KB 载荷配额，或 macOS 专属的滚动条行为。');
      return true;
    }
    if (flatOriginal.includes('Baseline-Aware Integration') && (flatOriginal.includes('real-time compatibility data') || flatOriginal.includes('Baseline project') || flatOriginal.includes('compatibility data from the Baseline project'))) {
      writeBlockText(target, '基线感知集成：我们利用来自 Baseline 项目的实时兼容性数据，以便智能体能够根据当前的浏览器支持情况和任何浏览器支持偏好动态自适应。');
      return true;
    }
    if (flatOriginal.includes('Activation') && flatOriginal.includes('activates the') && flatOriginal.includes('modern-web-guidance')) {
      writeBlockText(target, '1. 激活：编程智能体因相关任务激活 modern-web-guidance 技能。智能体被指示使用 modern-web-guidance CLI 进行 Web 平台查询。');
      return true;
    }
    if (flatOriginal.includes('Local Semantic Search') && (flatOriginal.includes('TensorFlow.js') || flatOriginal.includes('modern-web-guidance search'))) {
      writeBlockText(target, '2. 本地语义搜索：智能体运行 modern-web-guidance search "<query>"。工具使用离线、CPU 高效的 TensorFlow.js 模型匹配最佳指南（无网络调用，无需 API 密钥）。');
      return true;
    }
    if (flatOriginal.includes('Guide Fetch') && (flatOriginal.includes('retrieve <guide-id>') || flatOriginal.includes('targeted code patterns') || flatOriginal.includes('modern-web-guidance retrieve'))) {
      writeBlockText(target, '3. 获取指南：智能体通过 modern-web-guidance retrieve <guide-id> 检索指南，将针对性的代码模式、陷阱注意与兜底方案直接注入上下文窗口。');
      return true;
    }
    if (flatOriginal.includes('We use') && flatOriginal.includes('npx') && (flatOriginal.includes('supply-chain security') || flatOriginal.includes('content does') || flatOriginal.includes("content doesn't"))) {
      writeBlockText(target, '提示：我们使用 npx 以确保内容不过时，但 CLI 支持离线运行，完全私密且本地化。npm 包为自包含包，没有额外依赖项，既保证低延迟又保证供应链安全。');
      return true;
    }
    if (flatOriginal.includes('Smooth visual states') && flatOriginal.includes('View Transitions')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Smooth visual states')) writeText(n, '流畅视觉状态（视图过渡、进出场动画、视差滚动、CSS ', t);
        else if (t.trim() === ').') writeText(n, '）。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Modern layout systems') && flatOriginal.includes('container queries')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Modern layout systems')) writeText(n, '现代布局系统（容器查询、', t);
        else if (t.includes('modern color spaces like')) writeText(n, '、', t);
        else if (t.includes('text-wrap tuning, and line-height trimming')) writeText(n, ' 等现代色彩空间、文本换行调优与行高微调）。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Speed optimizations') && flatOriginal.includes('instant preloading')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Speed optimizations')) writeText(n, '速度优化（即时预加载、Interaction to Next Paint (INP) 诊断、以及通过 ', t);
        else if (t.includes('scheduling tasks via')) writeText(n, ' 调度任务）。', t);
        else if (t.trim() === ').') writeText(n, '）。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Native components') && flatOriginal.includes('Anchor Positioning')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Native components')) writeText(n, '原生组件（用于工具提示的锚点定位、Popover API、对话框、', t);
        else if (t.includes('validation, and auto-sizing fields')) writeText(n, ' 校验以及自动调整尺寸的输入字段）。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Important considerations') && flatOriginal.includes('screen reader and keyboard operability')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Important considerations')) writeText(n, '重要考量（屏幕阅读器与键盘可操作性、内容导航与可发现性）。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Local client models') && flatOriginal.includes('native translation, summarization')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Local client models')) writeText(n, '本地客户端模型（原生翻译、文本摘要与语言检测 API）。', t);
      }
      return true;
    }
    if (flatOriginal.includes('Portions of the documentation in this project are derived from') && flatOriginal.includes('MDN Web Docs')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Portions of the documentation in this project are derived from')) writeText(n, '本项目文档的部分内容衍生自 Mozilla 贡献者的 ', t);
        else if (t.includes('by Mozilla Contributors and')) writeText(n, ' 以及 ', t);
        else if (t.includes('specifications.')) writeText(n, ' 规范。', t);
      }
      return true;
    }
    if (flatOriginal.includes('We developed a robust eval harness') && flatOriginal.includes('closed-loop validation pipeline')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('We developed a robust eval harness')) {
          writeText(n, '我们构建了一套稳健的评估套件，以确保内容经过实证检验并持续校准，进而确保 AI 智能体能够编写更出色的代码。我们使用闭环验证流水线运行自动化评估：', t);
        } else if (t.includes('empirically proven and continuously calibrated') || t.includes('ensure AI agents write better code') || t.includes('closed-loop validation pipeline')) {
          writeText(n, '', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Simulated Developer Tasks') && (flatOriginal.includes('make my images load faster') || flatOriginal.includes('mimic real-world') || flatOriginal.includes('developer prompts'))) {
      writeBlockText(target, '0. 模拟开发者任务：我们定义了模仿真实需求的真实开发者提示词（例如“让我的图片加载更快”）。这些提示词避免直接指明具体的 API 或特性，以此测试智能体是否能够自然、顺利地发现相关指南。');
      return true;
    }
    if (flatOriginal.includes('Browser-based Assertions') && (flatOriginal.includes('runtime behavior') || flatOriginal.includes('computed styles') || flatOriginal.includes('exact runtime behaviors'))) {
      writeBlockText(target, '1. 基于浏览器的断言验证：我们编写浏览器自动化脚本，以验证指南是否被正确遵循：精确的运行时行为、计算样式、无障碍辅助状态等。');
      return true;
    }
    if (flatOriginal.includes('Self-Healing Calibration') && flatOriginal.includes('reference implementation')) {
      writeBlockText(target, '2. 自我修复校准：评分器同时对照基准参考实现（目标 100% 通过）与对照页面（目标 0% 通过）进行校准。一旦测试失败，智能体将自动优化测试用例。');
      return true;
    }
    if (flatOriginal.includes('E2E Testing') && (flatOriginal.includes('unguided pass rate') || flatOriginal.includes('maximize the uplift') || flatOriginal.includes('opportunity'))) {
      writeBlockText(target, '3. 端到端 (E2E) 测试：我们衡量编程智能体在有指导与无指导两种情况下完成真实任务的表现。其中“提升潜力”（100% - 无指导通过率）与“净提升幅度”（有指导通过率 - 无指导通过率）是核心指标。如果提升潜力极小，说明模型本身已经完成得非常出色，我们的指南未能带来多少增益；基于这些评测结果，我们不断修订指南以最大化净提升幅度，从而持续优化指南的实用成效。');
      return true;
    }
    if (flatOriginal.includes('Google collects anonymous usage information') && flatOriginal.includes('modern-web.ts')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Google collects anonymous usage information')) {
          writeText(n, 'Google 会收集匿名使用情况信息，以改进工具的可靠性、相关性与性能。收集的信息包括安装次数、调用智能体名称、指南检索 ID 以及由智能体生成的 CLI 工具搜索查询（例如“dark mode scrollbar color-scheme”）。我们绝不会收集用户的原始输入提示词。您可以在 ', t);
        } else if (t.includes('modern-web.ts')) {
          writeText(n, 'modern-web.ts', t);
        } else if (t.includes('You can inspect what is collected in') || t.trim() === '.') {
          writeText(n, ' 中查阅具体收集的数据项。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('DISABLE_TELEMETRY=1') && (flatOriginal.includes('To Opt-Out') || flatOriginal.includes('shell profile'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('To Opt-Out:')) writeText(n, '选择停用：', t);
        else if (t.includes('set the')) writeText(n, '请在您的 Shell 配置文件（例如 ', t);
        else if (t.includes('env variable in your shell profile')) writeText(n, '）中设置 ', t);
        else if (t.includes(' or ')) writeText(n, ' 或 ', t);
        else if (t.trim() === '):') writeText(n, ' 环境变量：', t);
      }
      return true;
    }
    if (flatOriginal.includes("If you'd like to contribute to modern-web-guidance") && flatOriginal.includes('CONTRIBUTING.md')) {
      writeBlockText(target, '如果您希望为 modern-web-guidance 做出贡献，请参阅源码仓库中的 CONTRIBUTING.md (https://github.com/GoogleChrome/modern-web-guidance-src/blob/main/CONTRIBUTING.md)。modern-web-guidance 仓库纯粹是用于纯净安装技能的发布目标。');
      return true;
    }

    // ==========================================
    // 4. Google Developer Knowledge
    // ==========================================
    if (flatOriginal.includes('Google Developer Knowledge plugin connects your coding agent') && flatOriginal.includes('authoritative documentation across')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('The') && t.trim() === 'The') writeText(n, '', t);
        else if (t.includes('plugin connects your coding agent to the official')) writeText(n, ' 插件将您的编码智能体连接到官方 ', t);
        else if (t.includes('Google Developer Knowledge API')) writeText(n, 'Google Developer Knowledge API', t);
        else if (t.includes('and Model Context Protocol (MCP) server')) writeText(n, ' 和模型上下文协议 (MCP) 服务器。您的智能体无需依赖模型训练截止时间或未经核实的网络搜索结果，即可直接查询以下领域的权威文档：', t);
      }
      return true;
    }
    if (flatOriginal.includes('Google Cloud & Apigee') && flatOriginal.includes('cloud.google.com')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Google Cloud & Apigee')) writeText(n, 'Google Cloud 与 Apigee', t);
      }
      return true;
    }
    if (flatOriginal.includes('Google AI, Gemini & ML') && flatOriginal.includes('ai.google.dev')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Google AI, Gemini & ML')) writeText(n, 'Google AI、Gemini 与机器学习', t);
      }
      return true;
    }
    if (flatOriginal.includes('Flutter & Dart') && flatOriginal.includes('docs.flutter.dev')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Flutter & Dart')) writeText(n, 'Flutter 与 Dart', t);
      }
      return true;
    }
    if (flatOriginal.includes('Chrome & Web') && flatOriginal.includes('developer.chrome.com')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Chrome & Web')) writeText(n, 'Chrome 与 Web', t);
      }
      return true;
    }
    if (flatOriginal.includes('Google Developers, Workspace & Home') && flatOriginal.includes('developers.google.com')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Google Developers, Workspace & Home')) writeText(n, 'Google 开发者、Workspace 与智能家居', t);
      }
      return true;
    }
    if (flatOriginal.includes('Go, Google Maps Platform & Fuchsia') && flatOriginal.includes('go.dev')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Go, Google Maps Platform & Fuchsia')) writeText(n, 'Go、Google Maps Platform 与 Fuchsia', t);
      }
      return true;
    }
    if (flatOriginal.includes('Using the Google Developer Knowledge API and MCP server requires a Google Cloud project')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Using the Google Developer Knowledge API and MCP server requires')) {
          writeText(n, '使用 Google Developer Knowledge API 和 MCP 服务器需要一个已启用 ', t);
        } else if (t.includes('Developer Knowledge API')) {
          writeText(n, 'Developer Knowledge API', t);
        } else if (t.includes('enabled. You can authenticate using either')) {
          writeText(n, ' 的 Google Cloud 项目。您可以使用 ', t);
        } else if (t.includes('Application Default Credentials (ADC)')) {
          writeText(n, '应用程序默认凭据 (ADC)', t);
        } else if (t.includes('or an')) {
          writeText(n, ' 或 ', t);
        } else if (t.includes('API key')) {
          writeText(n, 'API 密钥', t);
        } else if (t.trim() === '.') {
          writeText(n, ' 进行身份验证。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Enable the API on your Google Cloud project using the')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Enable the API on your Google Cloud project using the')) {
          writeText(n, '使用 ', t);
        } else if (t.includes('Google Cloud Console')) {
          writeText(n, 'Google Cloud 控制台', t);
        } else if (t.includes('or the')) {
          writeText(n, ' 或 gcloud CLI 在您的 Google Cloud 项目中启用该 API：', t);
        } else if ((t.includes('gcloud') && n.parentElement?.matches('code')) || t.includes('CLI')) {
          writeText(n, '', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('bundled') && flatOriginal.includes('google-developer-knowledge') && flatOriginal.includes('Application Default Credentials')) {
      writeBlockText(target, '内置的 google-developer-knowledge MCP 服务器配置会自动使用本地 Google Cloud 应用程序默认凭据 (google_credentials)：');
      return true;
    }
    if (flatOriginal.includes('Ensure your account has the') && flatOriginal.includes('Service Usage Consumer')) {
      writeBlockText(target, '确保您的账号在 YOUR_PROJECT_ID 上拥有“Service Usage 消费方”(roles/serviceusage.serviceUsageConsumer) IAM 角色。');
      return true;
    }
    if (flatOriginal.includes('Alternatively, create an API key in the') && flatOriginal.includes('Google Cloud Console Credentials page')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Alternatively, create an API key in the')) {
          writeText(n, '或者，在 ', t);
        } else if (t.includes('Google Cloud Console Credentials page')) {
          writeText(n, 'Google Cloud 控制台凭据页面', t);
        } else if (t.includes('restricted to the')) {
          writeText(n, ' 创建 API 密钥（限定于 ', t);
        } else if (t.includes('Developer Knowledge API')) {
          writeText(n, 'Developer Knowledge API', t);
        } else if (t.includes('and export it in your environment for the')) {
          writeText(n, '），并在您的环境中导出该密钥，以供技能的 REST API 兜底使用：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('To authenticate the remote MCP server directly with an API key instead of ADC')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('To authenticate the remote MCP server directly with an API key')) {
          writeText(n, '若要使用 API 密钥而非 ADC 直接对远程 MCP 服务器进行身份验证，请在 MCP 服务器配置中设置 X-Goog-Api-Key 请求头：', t);
        } else if (t.includes('X-Goog-Api-Key') || t.includes('MCP server configuration')) {
          writeText(n, '', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('answer_query') && flatOriginal.includes('Ask natural-language technical questions')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Ask natural-language technical questions')) {
          writeText(n, '：提出自然语言技术问题，获取基于 Google 官方文档并带有权威引用来源的综合解答。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('search_documents') && flatOriginal.includes('Search across official Google developer documentation')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Search across official Google developer documentation')) {
          writeText(n, '：在官方 Google 开发者文档中搜索匹配的页面和代码片段。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('get_documents') && flatOriginal.includes('Fetch the full Markdown content')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Fetch the full Markdown content')) {
          writeText(n, '：按文档名称获取一个或多个文档页面的完整 Markdown 内容（单次调用最多支持 20 个文档名称）。', t);
        }
      }
      return true;
    }

    // ==========================================
    // 5. Data Agent Kit
    // ==========================================
    if (flatOriginal.includes('walk you through configuring Data Agent Kit')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('walk you through configuring')) {
          writeText(n, '向您的智能体提供任何提示，它将引导您完成 Data Agent Kit 的配置。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('manually invoke the Data Agent Kit setup skill')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('manually invoke the Data Agent Kit setup skill')) {
          writeText(n, '或者，您也可以手动调用 Data Agent Kit 设置技能：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Restart your agent when prompted to complete the setup')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Restart your agent when prompted')) {
          writeText(n, '收到提示时重启智能体以完成设置。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Data engineering') && flatOriginal.includes('Build pipelines that turn source data into analysis-ready tables')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Data engineering')) {
          writeText(n, '数据工程：', t);
        } else if (t.includes('Build pipelines that turn source data')) {
          writeText(n, '构建将源数据转换为分析就绪数据表的流水线，并在过程中执行质量检查。使用 dbt 或 Dataform 开发转换，使用 Managed Service for Apache Airflow 调度工作流，并进行调试。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Data science') && flatOriginal.includes('Jupyter notebooks')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Data science')) {
          writeText(n, '数据科学：', t);
        } else if (t.includes('Develop experiments in Jupyter notebooks')) {
          writeText(n, '在本地 Python 或远程 Managed Service for Apache Spark 内核上的 Jupyter Notebook 中开发实验。准备来自 BigQuery 的特征，使用 BigQuery ML 训练模型，并调度批量推理。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Data analysis') && flatOriginal.includes('AlloyDB')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Data analysis')) {
          writeText(n, '数据分析：', t);
        } else if (t.includes('Explore data across BigQuery')) {
          writeText(n, '在 BigQuery、AlloyDB 和 Cloud SQL 之间探索数据。在数据质量指标和数据血缘的引导下使用 Knowledge Catalog 查找数据集，然后构建可视化图表或可复用的数据模型。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Data Agent Kit collects usage statistics') && flatOriginal.includes('No user code, file contents, or application data values are collected')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Data Agent Kit collects usage statistics')) {
          writeText(n, 'Data Agent Kit 会收集使用情况统计信息（例如所包含的技能和 MCP 工具的使用时机），以改进可靠性和性能。绝不会收集任何用户代码、文件内容或应用程序数据值。', t);
        }
      }
      return true;
    }

    // ==========================================
    // 6. Google Cloud Developer
    // ==========================================
    if (flatOriginal.includes('The google-cloud-developer plugin equips Antigravity with foundational skills')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('The') && t.trim() === 'The') writeText(n, '', t);
        else if (t.includes('google-cloud-developer') || t.includes('plugin equips Antigravity')) {
          writeText(n, 'google-cloud-developer 插件为 Antigravity 配备了在 Google Cloud 上构建应用所需的基础技能、安全防护栏以及实时文档佐证。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('This plugin bundles curated Agent Skills, routing rules, and configuration for the')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('This plugin bundles curated Agent Skills')) {
          writeText(n, '该插件将精选的智能体技能、路由规则以及 ', t);
        } else if (t.includes('Developer Knowledge MCP server')) {
          writeText(n, 'Developer Knowledge MCP 服务器', t);
        } else if (t.includes('into a single portable package')) {
          writeText(n, ' 的配置整合进一个便捷的安装包中。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Safety-critical validation, best practices, and execution guardrails for gcloud CLI commands')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Safety-critical validation')) {
          writeText(n, '：针对 gcloud CLI 命令的关键安全验证、最佳实践与执行防护栏。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Authentication workflows, credential selection, and service identity best practices')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Authentication workflows')) {
          writeText(n, '：身份验证工作流、凭据选择以及服务身份最佳实践。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('First-project onboarding, account setup, and billing configuration')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('First-project onboarding')) {
          writeText(n, '：首个项目快速上手、账号设置以及结算配置。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Discovery and on-demand installation of specialized skills from the Google Agent Skills repo')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Discovery and on-demand installation')) {
          writeText(n, '：从 Google Agent Skills 仓库中按需发现并安装专业技能。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Grounded retrieval of official Google documentation')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Grounded retrieval')) {
          writeText(n, '：官方 Google 文档的权威检索。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Provides AI agents with up-to-date grounding in official Google developer documentation over streamable HTTP')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Provides AI agents with up-to-date grounding')) {
          writeText(n, '：通过流式 HTTP 为 AI 智能体提供官方 Google 开发者文档的最新检索依据。', t);
        }
      }
      return true;
    }
// [Removed redundant GCD rules]

    // ==========================================
    // 7. Dart and Flutter
    // ==========================================
    if (flatOriginal.includes('This plugin is designed to extend AI agent capabilities for Flutter development')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('This plugin is designed to extend')) {
          writeText(n, '该插件旨在扩展 AI 智能体在 Flutter 开发中的能力。它整合了技能、MCP 服务器配置和规则，为常见 Dart 和 Flutter 开发工作流向智能体提供量身定制的指导。通过赋予智能体领域专业知识，大幅减少错误，并确保智能体遵循最佳实践可靠地完成任务。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('The official plugin for Dart and Flutter maintained by the Flutter team')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('The official plugin for Dart and Flutter')) {
          writeText(n, '由 Flutter 团队官方维护的 Dart 与 Flutter 专属插件。', t);
        }
      }
      return true;
    }

    // ==========================================
    // 8. Science Plugin
    // ==========================================
    if (flatOriginal.includes('collection of extensions') && flatOriginal.includes('scientific research tasks')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('A collection of extensions') || t.includes('collection of extensions')) {
          writeText(n, '用于科学研究任务的扩展合集（如技能），涵盖基因组学、结构生物学、化学信息学、科学文献等领域。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Each extension provides structured instructions') && flatOriginal.includes('specialized scientific tasks')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Each extension provides structured instructions')) {
          writeText(n, '每个扩展都提供结构化的指令、脚本和资源，为专业科学任务扩展 Antigravity 的能力。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('package manager to handle dependencies') && flatOriginal.includes('Science Plugin')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('We use the') || t.includes('We use') || t.includes('我们使用')) {
          writeText(n, '我们使用 ', t);
        } else if (t.includes('package manager to handle dependencies')) {
          writeText(n, ' 包管理器来管理依赖。首次在科学计算插件中触发扩展时，智能体将请求安装 ', t);
        } else if (t.includes('and then proceed to respond to your scientific query')) {
          writeText(n, ' 的许可，然后继续响应您的科学计算查询/任务。建议在首次安装后重启 Antigravity。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Some skills, such as AlphaGenome and OpenAlex, require an API key')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Some skills, such as AlphaGenome')) {
          writeText(n, '某些技能（例如 AlphaGenome 和 OpenAlex）需要 API 密钥才能工作。其他技能（例如 ClinVar）使用 API 密钥可以解锁更高的速率限制，但在没有密钥的情况下仍可正常工作。智能体应提示您获取 API 密钥并指导您写入到正确的位置。但是，如果您希望自己手动配置，可以在终端中运行如下命令：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('customize existing extensions') || flatOriginal.includes('customize an existing extension') || (flatOriginal.includes('customize') && flatOriginal.includes('Science Plugin') && flatOriginal.includes('installation directory'))) {
      writeBlockText(target, '如果您希望自定义现有扩展或创建自己的新扩展，切勿直接修改 Science 插件安装目录内的文件，因为每当 Science 插件更新时，您的更改都会被覆盖。相反，请将自定义或修改后的扩展存放在其他位置，例如技能可以放置在您的个人技能目录中：');
      return true;
    }

    // ==========================================
    // 9. Google Workspace 系列插件
    // ==========================================
    if (flatOriginal.includes('Run your Google Calendar. Find a time that works for everyone')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Run your Google Calendar')) {
          writeText(n, '管理您的 Google 日历。寻找大家都有空的时间、发送邀请、预留专注时间并直接在对话中解决日程冲突。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Read and write your Google Docs. Summarize any doc from its link')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Read and write your Google Docs')) {
          writeText(n, '阅读和编写您的 Google 文档。通过链接总结任何文档，在新建文档中起草提案和公告，以及回复并解决待处理的批注评论。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Find and organize your Google Drive. Search across your files')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Find and organize your Google Drive')) {
          writeText(n, '查找并整理您的 Google 云端硬盘。跨文件进行搜索，整理文件夹，与合适的人员共享，并将其下载或导出为 PDF、CSV 或 Markdown。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Read, write, and format your Google Sheets. Fill in formulas')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Read, write, and format your Google Sheets')) {
          writeText(n, '读取、编写和设置 Google 表格格式。填充公式、排序列与清洗数据、构建数据透视表，将杂乱的电子表格转换为结构化数据。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Build and polish your Google Slides. Turn notes into a deck')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Build and polish your Google Slides')) {
          writeText(n, '制作并打磨您的 Google 幻灯片。将笔记转化为演示文稿，添加幻灯片、图片和演讲者备注，并将结果导出为 PDF 或 PowerPoint。', t);
        }
      }
      return true;
    }

    // --- Google Developer Knowledge Full Coverage ---
    if (flatOriginal.includes('Google Developer Knowledge plugin connects your coding agent') && (flatOriginal.includes('official') || flatOriginal.includes('Model Context Protocol'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('The') && t.trim() === 'The') {
          writeText(n, '', t);
        } else if (t.includes('Google Developer Knowledge') && n.parentElement?.matches('strong')) {
          writeText(n, 'Google Developer Knowledge', t);
        } else if (t.includes('plugin connects your coding agent') || t.includes('official')) {
          writeText(n, ' 插件将您的编码智能体连接到官方 ', t);
        } else if (t.includes('Google Developer Knowledge API')) {
          writeText(n, 'Google Developer Knowledge API', t);
        } else if (t.includes('Model Context Protocol') || t.includes('relying on model training cutoffs') || t.includes('directly query authoritative documentation')) {
          writeText(n, ' 和模型上下文协议 (MCP) 服务器。智能体无需依赖模型训练截止时间或未经核实的网络搜索结果，即可直接查询以下领域的权威文档：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Using the Google Developer Knowledge API and MCP server requires a Google Cloud') || (flatOriginal.includes('Developer Knowledge API') && flatOriginal.includes('developerknowledge.googleapis.com') && flatOriginal.includes('authenticate using'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Using the Google Developer Knowledge API') || t.includes('requires a Google Cloud')) {
          writeText(n, '使用 Google Developer Knowledge API 和 MCP 服务器需要一个已启用 ', t);
        } else if (t.includes('Developer Knowledge API') && n.parentElement?.matches('strong')) {
          writeText(n, 'Developer Knowledge API', t);
        } else if (t.includes('enabled. You can authenticate using') || t.includes('enabled')) {
          writeText(n, ' 的 Google Cloud 项目。您可以使用 ', t);
        } else if (t.includes('Application Default Credentials') || t.includes('ADC')) {
          writeText(n, '应用程序默认凭据 (ADC)', t);
        } else if (t.includes('or an') || t.includes('either')) {
          writeText(n, ' 或 ', t);
        } else if (t.includes('API key') || t.includes('API 密钥')) {
          writeText(n, 'API 密钥', t);
        } else if (t.trim() === '.') {
          writeText(n, ' 进行身份验证。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Enable the API on your Google Cloud project using the') && (flatOriginal.includes('Google Cloud Console') || flatOriginal.includes('gcloud CLI'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Enable the API on your Google Cloud project using the')) {
          writeText(n, '使用 ', t);
        } else if (t.includes('Google Cloud Console')) {
          writeText(n, 'Google Cloud 控制台', t);
        } else if (t.includes('or the') || t.includes('CLI:')) {
          writeText(n, ' 或 gcloud CLI 在您的 Google Cloud 项目中启用该 API：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Ensure your account has the') && flatOriginal.includes('serviceUsageConsumer') && flatOriginal.includes('YOUR_PROJECT_ID')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Ensure your account has the')) {
          writeText(n, '确保您的账号在 YOUR_PROJECT_ID 上具有“Service Usage 消费方”(roles/serviceusage.serviceUsageConsumer) IAM 角色。', t);
        } else if (t.includes('Service Usage Consumer') || t.includes('serviceUsageConsumer') || t.includes('YOUR_PROJECT_ID')) {
          writeText(n, '', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('create an API key in the') && flatOriginal.includes('Credentials page') && flatOriginal.includes('REST API fallback')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Alternatively, create an API key in the') || t.includes('create an API key in the')) {
          writeText(n, '或者，在 ', t);
        } else if (t.includes('Google Cloud Console Credentials page') || t.includes('Credentials page')) {
          writeText(n, 'Google Cloud 控制台凭据页面', t);
        } else if (t.includes('restricted to the') || t.includes('REST API fallback')) {
          writeText(n, ' 创建 API 密钥（限定于 Developer Knowledge API），并在环境中导出以供技能的 REST API 兜底使用：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('To authenticate the remote MCP server directly with an API key instead of ADC') && flatOriginal.includes('X-Goog-Api-Key')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('To authenticate the remote MCP server directly with an API key')) {
          writeText(n, '若要使用 API 密钥而非 ADC 直接对远程 MCP 服务器进行身份验证，请在 MCP 服务器配置中设置 X-Goog-Api-Key 请求头：', t);
        } else if (t.includes('X-Goog-Api-Key') || t.includes('MCP server configuration')) {
          writeText(n, '', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('answer_query') && flatOriginal.includes('Ask natural-language technical questions and receive synthesized answers')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('answer_query')) writeText(n, 'answer_query', t);
        else if (t.includes('Ask natural-language technical questions') || t.includes('synthesized answers grounded in official')) {
          writeText(n, '：提出自然语言技术问题，获取基于 Google 官方文档并带有来源引用的综合解答。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('get_documents') && flatOriginal.includes('Fetch the full Markdown content of one or more documentation pages')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('get_documents')) writeText(n, 'get_documents', t);
        else if (t.includes('Fetch the full Markdown content') || t.includes('accepts up to 20 document names')) {
          writeText(n, '：根据文档名称获取一个或多个文档页面的完整 Markdown 内容（单次调用最多支持 20 个文档名称）。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Provides structured workflows and domain filter guidance so the agent selects the best query strategy')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Provides structured workflows and domain filter guidance')) {
          writeText(n, '提供结构化的工作流和领域筛选指导，以便智能体选择最佳查询策略、将搜索限定在正确的 Google 产品领域、验证版本敏感的 API 细节，并在需要时平稳兜底。', t);
        }
      }
      return true;
    }

    // --- Science Plugin Full Coverage ---
    if (target.matches('h1, h2, h3, h4, h5, h6') && flatOriginal.trim() === 'Learn More') {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.trim() === 'Learn More') writeText(n, '了解更多', t);
      }
      return true;
    }
    if (flatOriginal.includes('You can find examples of Science Plugin use cases') && flatOriginal.includes('antigravity.google/use-cases/science')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('You can find examples of Science Plugin use cases')) {
          writeText(n, '您可以在 ', t);
        } else if (t.includes('antigravity.google/use-cases/science')) {
          writeText(n, 'antigravity.google/use-cases/science', t);
        } else if (t.trim() === '.') {
          writeText(n, ' 查看 Science 插件的使用案例示例，包括演示 Demo。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('All software is licensed under the Apache License, Version 2.0') && flatOriginal.includes('compliance with the Apache 2.0 license')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('All software is licensed under the Apache License') || t.includes('obtain a copy of the Apache 2.0 license at:')) {
          writeText(n, '所有软件均在 Apache 许可证 2.0 版 (Apache 2.0) 下获得许可；除非遵守 Apache 2.0 许可证，否则您不得使用本文件。您可以在以下网址获取 Apache 2.0 许可证的副本：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Skill Licences and Terms of Use') && flatOriginal.includes('certain third party data sources referenced within individual Skill files')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('As set out in the attached file') || t.includes('Skill Licences and Terms of Use') || t.includes('certain third party data sources')) {
          writeText(n, '如随附文件“技能许可与使用条款”中所述，单个技能文件中引用的某些第三方数据源具有其各自适用的许可和/或使用条款。有关更多信息，请参阅“技能许可与使用条款”文件。您有责任确保您对单个技能文件的使用符合任何此类适用的许可/使用条款。', t);
        } else if (t.includes('file for more information') || t.includes('You are responsible for ensuring')) {
          writeText(n, '', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('All other materials are licensed under the Creative Commons Attribution 4.0') && flatOriginal.includes('CC-BY')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('All other materials are licensed under') || t.includes('obtain a copy of the CC-BY license at:')) {
          writeText(n, '所有其他材料均根据知识共享署名 4.0 国际许可协议 (CC-BY) 获得许可。您可以在以下网址获取 CC-BY 许可协议的副本：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Unless required by applicable law or agreed to in writing') && flatOriginal.includes('WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Unless required by applicable law') || t.includes('WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND') || t.includes('See the licenses for the specific language')) {
          writeText(n, '除非适用法律要求或书面同意，根据 Apache 2.0 或 CC-BY 许可分发的所有软件和材料均按“原样”分发，不提供任何明示或暗示的保证或条件。请参阅相应许可了解管理权限和限制的具体条款。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('customize existing extensions') || flatOriginal.includes('customize an existing extension') || (flatOriginal.includes('customize') && flatOriginal.includes('Science Plugin') && flatOriginal.includes('installation directory'))) {
      writeBlockText(target, '如果您希望自定义现有扩展或创建自己的新扩展，切勿直接修改 Science 插件安装目录内的文件，因为每当 Science 插件更新时，您的更改都会被覆盖。相反，请将自定义或修改后的扩展存放在其他位置，例如技能可以放置在您的个人技能目录中：');
      return true;
    }
    if (flatOriginal.includes('The agent should prompt you to obtain the API key and guide you through writing in the correct location') && flatOriginal.includes('run a command like this in your terminal')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('The agent should prompt you to obtain the API key')) {
          writeText(n, '智能体应提示您获取 API 密钥，并引导您将其写入正确位置。但是，如果您更愿意手动操作，可以在终端中运行如下命令：', t);
        }
      }
      return true;
    }

    // --- Google Cloud Developer & Data Agent Kit & Android CLI Additional Coverage ---
    if (flatOriginal.includes('Safety-critical validation, best practices, and execution guardrails for gcloud CLI commands')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('gcloud') && t.trim() === 'gcloud') writeText(n, 'gcloud', t);
        else if (t.includes('Safety-critical validation, best practices, and execution guardrails')) {
          writeText(n, '：针对 gcloud CLI 命令的安全关键验证、最佳实践与执行防护栏。', t);
        }
      }
      return true;
    }
// [Removed redundant GCD duplicate 2]
    if (flatOriginal.includes('If you see could not find default credentials or other auth errors') && flatOriginal.includes('ensure you are logged into gcloud')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('If you see could not find default credentials')) {
          writeText(n, '如果您看到“找不到默认凭据”或其他认证错误，请确保您已登录 gcloud 和 ADC。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Exit your agent, run gcloud auth login followed by gcloud auth application-default login, then restart')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Exit your agent')) {
          writeText(n, '退出智能体，依次运行 gcloud auth login 和 gcloud auth application-default login，然后重启。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Android CLI is the official command-line interface that standardizes core Android development')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Android CLI is the official command-line interface')) {
          writeText(n, 'Android CLI 是一款官方命令行工具，旨在为 AI 编程智能体标准化核心 Android 开发能力。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Initialize Android CLI') && flatOriginal.includes('You must run android init for Antigravity to discover')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Initialize Android CLI')) writeText(n, '初始化 Android CLI', t);
        else if (t.includes('You must run android init for Antigravity to discover and use Android CLI:')) {
          writeText(n, '：您必须运行 android init 才能让 Antigravity 发现并使用 Android CLI：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Update Android CLI') && flatOriginal.includes('To keep your CLI and embedded skills up to date')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Update Android CLI')) writeText(n, '更新 Android CLI', t);
        else if (t.includes('To keep your CLI and embedded skills up to date, run:')) {
          writeText(n, '：要保持 CLI 和内置技能处于最新状态，请运行：', t);
        }
      }
      return true;
    }

    // ==========================================
    // 4. Google Developer Knowledge
    // ==========================================
    if (flatOriginal.includes('The Google Developer Knowledge plugin connects your coding agent') && flatOriginal.includes('authoritative documentation across:')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('The Google Developer Knowledge plugin connects your coding agent')) {
          writeText(n, 'Google Developer Knowledge 插件将您的编程智能体连接到官方 ', t);
        } else if (t.includes('and Model Context Protocol (MCP) server')) {
          writeText(n, ' 和模型上下文协议 (MCP) 服务器。您的智能体无需依赖模型训练截止时间或未经核实的网络搜索结果，而是可以直接查询以下各个领域的权威文档：', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('The bundled google-developer-knowledge MCP server configuration') || (flatOriginal.includes('bundled') && flatOriginal.includes('google-developer-knowledge') && flatOriginal.includes('Application Default Credentials'))) {
      writeBlockText(target, '内置的 google-developer-knowledge MCP 服务器配置会自动使用本地 Google Cloud 应用程序默认凭据 (google_credentials)：');
      return true;
    }
    if (flatOriginal.includes('Remote MCP Server') && flatOriginal.includes('google-developer-knowledge')) {
      writeBlockText(target, '远程 MCP 服务器 (google-developer-knowledge)');
      return true;
    }
    if (flatOriginal.includes('Connects to') && flatOriginal.includes('developerknowledge.googleapis.com') && flatOriginal.includes('provides tools for documentation retrieval')) {
      writeBlockText(target, '连接至 https://developerknowledge.googleapis.com/mcp 并提供用于检索文档的工具：');
      return true;
    }
    if (flatOriginal.includes('Agent Skill') && flatOriginal.includes('retrieving-developer-knowledge')) {
      writeBlockText(target, '智能体技能 (retrieving-developer-knowledge)');
      return true;
    }
    if (flatOriginal.includes('Ensure your account has the Service Usage Consumer') && flatOriginal.includes('IAM role on')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Ensure your account has the Service Usage Consumer')) {
          writeText(n, '请确保您的账号在目标项目上拥有 Service Usage Consumer (roles/serviceusage.serviceUsageConsumer) IAM 角色。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('answer_query:') && flatOriginal.includes('synthesized answers grounded in official Google documentation')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('answer_query') && (n.parentElement?.matches('strong, code') || t.includes(':'))) {
          writeText(n, 'answer_query', t);
        } else if (t.includes('Ask natural-language technical questions') || t.includes('synthesized answers grounded in official Google documentation')) {
          writeText(n, '：提出自然语言技术问题，并获取基于官方 Google 文档佐证的综合解答及来源引用。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('search_documents:') && flatOriginal.includes('Search across official Google developer documentation')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('search_documents') && (n.parentElement?.matches('strong, code') || t.includes(':'))) {
          writeText(n, 'search_documents', t);
        } else if (t.includes('Search across official Google developer documentation') || t.includes('matching pages and snippets')) {
          writeText(n, '：在官方 Google 开发者文档中搜索匹配的页面和代码段。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('get_documents:') && flatOriginal.includes('Fetch the full Markdown content of one or more documentation pages')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('get_documents') && (n.parentElement?.matches('strong, code') || t.includes(':'))) {
          writeText(n, 'get_documents', t);
        } else if (t.includes('Fetch the full Markdown content') || t.includes('document names in a single call')) {
          writeText(n, '：通过文档名称获取一个或多个文档页面的完整 Markdown 内容（单次调用最多支持 20 个文档名称）。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Look up the exact gcloud CLI command and IAM roles needed to deploy a Cloud Run service')) {
      writeBlockText(target, '“查找使用 Secret Manager 部署 Cloud Run 服务所需的准确 gcloud CLI 命令和 IAM 角色。”', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Search official Google documentation for how to implement structured outputs with the Gemini API')) {
      writeBlockText(target, '“在官方 Google 文档中搜索如何使用 Gemini API 实现结构化输出。”', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Compare Cloud Run, GKE Autopilot, and App Engine based on official Google Cloud architecture guides')) {
      writeBlockText(target, '“根据官方 Google Cloud 架构指南，对比 Cloud Run、GKE Autopilot 和 App Engine。”', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('What are the latest Compose navigation best practices according to official Android developer docs')) {
      writeBlockText(target, '“根据官方 Android 开发者文档，最新的 Compose 导航最佳实践是什么？”', flatOriginal);
      return true;
    }

    // ==========================================
    // 5. Additional Gemini API & Android CLI & Science & GCD
    // ==========================================
    if (flatOriginal.includes('Build a stateful multi-turn chat script using the Interactions API')) {
      writeBlockText(target, '“使用 Interactions API 和最新模型构建有状态的多轮对话脚本。”');
      return true;
    }
    if (flatOriginal.includes('Create a real-time voice agent using the Gemini Live API')) {
      writeBlockText(target, '“使用 Gemini Live API 和非阻塞函数调用创建实时语音智能体。”');
      return true;
    }
    if (!target.closest('.leading-relaxed.select-text') && flatOriginal.includes('Generate multi-speaker dialogue audio') && (flatOriginal.includes('Gemini TTS') || flatOriginal.includes('speech_metadata'))) {
      writeBlockText(target, '“使用最新的 Gemini TTS 模型和 speech_metadata 注解生成多说话人对话音频。”');
      return true;
    }
    if (!target.closest('.leading-relaxed.select-text') && (flatOriginal.includes('Migrate') || flatOriginal.includes('migrate')) && flatOriginal.includes('client.models.generate_content') && flatOriginal.includes('client.interactions.create')) {
      writeBlockText(target, '“将 src/ 中的代码从 client.models.generate_content 迁移至 client.interactions.create。”');
      return true;
    }
    if (flatOriginal.includes('The skill installed by running this command is not removed if the Android plugin') || flatOriginal.includes("The skill installed by running this command isn't removed")) {
      writeBlockText(target, '如果卸载 Antigravity 的 Android 插件，通过运行此命令安装的技能不会被删除。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Creating a new Android project:') || (flatOriginal.includes('Creating a new Android project') && flatOriginal.includes('empty-activity template'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Creating a new Android project')) writeText(n, '创建新的 Android 项目：', t);
        else if (t.includes('Create a new Android project called MyFirstApp')) {
          writeText(n, '“使用 empty-activity 模板创建一个名为 MyFirstApp 的新 Android 项目”', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Running on a device:') || (flatOriginal.includes('Running on a device') && flatOriginal.includes('Samsung Galaxy Ultra'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Running on a device')) writeText(n, '在设备上运行：', t);
        else if (t.includes('Run my app on a Samsung Galaxy Ultra')) {
          writeText(n, '“在 Samsung Galaxy Ultra 设备上运行我的应用。”', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Testing & Play readiness:') || (flatOriginal.includes('Testing & Play readiness') && flatOriginal.includes('ready to publish to Google Play'))) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Testing & Play readiness')) writeText(n, '测试与 Google Play 上架就绪检查：', t);
        else if (t.includes('Test my app and make sure that it') || t.includes('ready to publish to Google Play')) {
          writeText(n, '“测试我的应用并确保其已准备好发布到 Google Play。”', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Initialize a new Android project from available templates.')) {
      writeBlockText(target, '从可用模板初始化新的 Android 项目。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Generate descriptive build target and artifact metadata for a project.')) {
      writeBlockText(target, '为项目生成构建目标和工件元数据描述。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Build, deploy, and launch an application on a connected device or emulator.')) {
      writeBlockText(target, '在已连接的设备或模拟器上构建、部署并启动应用程序。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Capture a screenshot from a connected device or emulator.')) {
      writeBlockText(target, '从已连接的设备或模拟器截取屏幕截图。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('List, start, stop, or manage Android Virtual Devices (AVDs).')) {
      writeBlockText(target, '列出、启动、停止或管理 Android 虚拟设备 (AVD)。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Inspect and manage Android SDK packages, build tools, and platforms.')) {
      writeBlockText(target, '检查并管理 Android SDK 软件包、构建工具和平台。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Display Android development environment diagnostic information.')) {
      writeBlockText(target, '显示 Android 开发环境诊断信息。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Inspect or manage skills provided by the Android CLI.')) {
      writeBlockText(target, '检查或管理 Android CLI 提供的技能。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Update the Android CLI and its embedded skills to the latest version.')) {
      writeBlockText(target, '将 Android CLI 及其内嵌技能更新至最新版本。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('The google-cloud-developer plugin equips Antigravity with foundational skills')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('The') && t.includes('google-cloud-developer')) {
          writeText(n, 'google-cloud-developer 插件为 Antigravity 提供了基础技能、规则以及 Developer Knowledge MCP 服务器，整合为一个即用型完整安装包。', t);
        } else {
          writeText(n, '', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Safety-critical validation, best practices, and execution guardrails for gcloud CLI commands.')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Safety-critical validation') || t.includes('execution guardrails for gcloud')) {
          writeText(n, '：针对 gcloud CLI 命令的关键安全验证、最佳实践与执行防护栏。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('Authentication workflows, credential selection, and service identity best practices.')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('Authentication workflows') || t.includes('service identity best practices')) {
          writeText(n, '：身份验证工作流、凭据选择与服务身份最佳实践。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('First-project onboarding, account setup, and billing configuration.')) {
      const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const t = originalText(n);
        if (t.includes('First-project onboarding') || t.includes('billing configuration')) {
          writeText(n, '：首个项目初始化、账号设置与结算配置。', t);
        }
      }
      return true;
    }
    if (flatOriginal.includes('As set out in the attached file') && flatOriginal.includes('Skill Licences and Terms of Use')) {
      writeBlockText(target, '正如随附的“技能许可与使用条款”文件中所述，各技能文件中引用的某些第三方数据源具有其各自适用的许可和/或使用条款。有关更多信息，请参阅“技能许可与使用条款”文件。您有责任确保对各技能文件的使用符合任何此类适用的许可/使用条款。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('We use the uv package manager to handle dependencies') && flatOriginal.includes('recommend restarting Antigravity after this first time installation')) {
      writeBlockText(target, '我们使用 uv 包管理器来处理依赖项。首次运行智能体技能时，uv 会自动创建隔离环境并安装相关依赖，然后继续响应您的科学计算查询/任务。我们建议在首次安装后重启 Antigravity。', flatOriginal);
      return true;
    }
    if (flatOriginal.includes('Science Plugin: scientific tools for your agent')) {
      writeBlockText(target, 'Science 插件：为您智能体提供的科学计算工具', flatOriginal);
      return true;
    }
    // --- Android CLI Installer Note ---
    if (flatOriginal.includes('If the android tool is not already in your PATH') && flatOriginal.includes('platform-specific installer')) {
      writeBlockText(target, '如果 android 工具尚未包含在您的 PATH 环境变量中，请使用适用于您平台的安装程序进行安装：');
      return true;
    }

    // --- Google Developer Knowledge Documentation Links ---
    if (flatOriginal.includes('Google Developer Knowledge Documentation') && target.matches('li, p, a')) {
      writeBlockText(target, 'Google 开发者知识库文档');
      return true;
    }
    if (flatOriginal.includes('Developer Knowledge MCP Server Guide') && target.matches('li, p, a')) {
      writeBlockText(target, 'Developer Knowledge MCP 服务器指南');
      return true;
    }

    // --- Modern Web Guidance How it Works & Adoption ---
    if (flatOriginal.includes('The coding agent activates the modern-web-guidance skill') && flatOriginal.includes('relevant task')) {
      writeBlockText(target, '1. 激活：编程智能体因相关任务激活 modern-web-guidance 技能。智能体被指示使用 modern-web-guidance CLI 进行 Web 平台查询。');
      return true;
    }
    if (flatOriginal.includes('Local Semantic Search') && flatOriginal.includes('TensorFlow.js model')) {
      writeBlockText(target, '2. 本地语义搜索：智能体运行 modern-web-guidance search "<query>"。工具使用离线、CPU 高效的 TensorFlow.js 模型匹配最佳指南（无网络调用，无需 API 密钥）。');
      return true;
    }
    if (flatOriginal.includes('Guide Fetch') && flatOriginal.includes('modern-web-guidance retrieve')) {
      writeBlockText(target, '3. 获取指南：智能体通过 modern-web-guidance retrieve <guide-id> 检索指南，将针对性的代码模式、陷阱注意与兜底方案直接注入上下文窗口。');
      return true;
    }
    if (flatOriginal.includes('Progressive Enhancement & Nuanced Fallbacks') && flatOriginal.includes('speculative preloading')) {
      writeBlockText(target, '渐进式增强与精细化回退：我们区分纯粹附加的增强功能（如推测性预加载，较旧浏览器可以安全地静默忽略）与关键行为（如对话框控件或网络信标，我们编写了深思熟虑、低开销的兜底方案）。');
      return true;
    }
    if (flatOriginal.includes('We prioritize lightweight, case-specific custom fallbacks') && flatOriginal.includes('polyfil')) {
      writeBlockText(target, '负责任的兜底方案：我们优先采用轻量级、针对特定场景的自定义兜底代码（<50 行），或按需加载的 polyfill，而非庞大的第三方依赖包。');
      return true;
    }
    if (flatOriginal.includes('Gotchas & Quirks') && flatOriginal.includes('fetchLater()')) {
      writeBlockText(target, '平台陷阱与特殊细节：我们记录了隐藏的平台限制，例如 fetchLater() 的 64KB 载荷配额，或 macOS 专属的滚动条行为。');
      return true;
    }
    if (flatOriginal.includes('Baseline-Aware Integration') && flatOriginal.includes('compatibility data from the Baseline project')) {
      writeBlockText(target, '基线感知集成：我们利用来自 Baseline 项目的实时兼容性数据，以便智能体能够根据当前的浏览器支持情况和任何浏览器支持偏好动态自适应。');
      return true;
    }
    if (flatOriginal.includes('We use npx to ensure the content does not go stale') || flatOriginal.includes("We use npx to ensure the content doesn't go stale")) {
      writeBlockText(target, '提示：我们使用 npx 以确保内容不过时，但 CLI 支持离线运行，完全私密且本地化。npm 包为自包含包，没有额外依赖项，既保证低延迟又保证供应链安全。');
      return true;
    }
    // --- Additional Plugin Fine Polish ---
    if (flatOriginal.includes('Supported by the Google Chrome team') && flatOriginal.includes('web development community')) {
      writeBlockText(target, '由 Google Chrome 团队、Microsoft Edge 团队和 Web 开发社区提供支持。');
      return true;
    }
    if (flatOriginal.includes("cover the past several years of the web platform's new features") || (flatOriginal.includes('cutting edge') && flatOriginal.includes('Token 效率'))) {
      writeBlockText(target, '我们涵盖了过去几年 Web 平台的新特性，一直延伸至最前沿的技术领域。指南专门针对 Token 效率进行了精简设计；我们通过运行评估，剔除了模型已熟知的普通常识内容。');
      return true;
    }
    if (flatOriginal.includes('Returns the active UI layout tree in JSON format')) {
      writeBlockText(target, '以 JSON 格式返回当前活动的 UI 布局树（支持 --pretty 和 --diff）。');
      return true;
    }
    if (flatOriginal.includes('Grant the service account only the') && flatOriginal.includes('roles-overview')) {
      writeBlockText(target, '仅向服务账号授予其所需的角色 (https://cloud.google.com/iam/docs/roles-overview)。');
      return true;
    }
    if (flatOriginal.includes('Gemini API Documentation in Google AI Studio')) {
      writeBlockText(target, 'Google AI Studio 中的 Gemini API 文档 (https://aistudio.google.com/docs)');
      return true;
    }
    if (flatOriginal.includes('Evals to prove this works well')) {
      writeBlockText(target, '评估测试证明其运行良好 ;)');
      return true;
    }

    // --- Modern Web Guidance 180 Skills Precision Overwrite ---
    if (target.matches('li, p, div')) {
      for (const [mwgKey, mwgZh] of Object.entries(mwgMap)) {
        if (flatOriginal.startsWith(mwgKey + ':') || flatOriginal.startsWith(mwgKey + '：')) {
          writeBlockText(target, mwgKey + '：' + mwgZh);
          return true;
        }
      }
    }



    
    // --- All 17 Official Plugins Skills Full Precision Overwrite ---
    for (const [skEn, skZh] of Object.entries(allOfficialSkillsMap)) {
      const skPrefix = skEn.slice(0, 35);
      if (flatOriginal.includes(skPrefix)) {
        writeBlockText(target, skZh);
        return true;
      }
    }
return false;
  }

  function translateSplitNoPhrase(element) {
    if (element.childElementCount || !element.firstChild ||
        shouldSkipTextNode(element.firstChild)) return false;
    const nodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
    if (!nodes.length) return false;
    const originals = nodes.map(originalText);
    const raw = originals.join("");
    const match = raw.match(/^(?:No|否) (matching )?(projects|项目|workspaces|工作区)( found| available)?$/);
    if (!match) return false;
    let applied = translations.get(raw);
    if (!applied) {
      const noun = /^(projects|项目)$/.test(match[2]) ? "项目" : "工作区";
      applied = match[1] ? `没有匹配的${noun}` : match[3] === " available" ? `没有可用的${noun}` : `没有找到${noun}`;
    }
    nodes.forEach((node, index) => writeText(node, index ? "" : applied, originals[index]));
    return true;
  }
  function writeAttribute(element, attribute, next, original) {
    let saved = elementOriginals.get(element);
    if (!saved) { saved = new Map(); elementOriginals.set(element, saved); }
    if (next === original) saved.delete(attribute);
    else saved.set(attribute, { original, applied: next });
    if (!saved.size) elementOriginals.delete(element);
    if (element.getAttribute(attribute) !== next) element.setAttribute(attribute, next);
  }
  function translateEmbeddedFrameMetadata(frame) {
    const current = frame.getAttribute('title');
    const record = elementOriginals.get(frame)?.get('title');
    const original = record && current === record.applied ? record.original : current;
    if (original === 'Inline Widget') writeAttribute(frame, 'title', translateValue(original), original);
  }
  function translateElement(element) {
    if (element instanceof Element && element.matches('iframe[data-testid="agent-embed-iframe"]') && element.closest('[data-testid="agent-embed"]')) {
      translateEmbeddedFrameMetadata(element);
      return;
    }
    if (element instanceof Element && element.matches('[data-testid="agent-embed"]')) {
      for (const frame of element.querySelectorAll('iframe[data-testid="agent-embed-iframe"]')) translateEmbeddedFrameMetadata(frame);
      return;
    }
    if (!(element instanceof Element) || isOpaque(element)) return;
    if (!isConversationContent(element) && translateDetailElement(element)) return;
    translateOnboardingContainer(element);
    localizeProjectTutorial(element);
    translateSkillAndPluginCard(element);
    if (element.matches(identitySelector)) return;
    if (element.matches('[data-testid="fastpick-prefix-trigger"]')) {
      const current = element.getAttribute('style');
      const record = elementOriginals.get(element)?.get('style');
      const original = record && current === record.applied ? record.original : current;
      element.style.whiteSpace = 'nowrap'; element.style.flexShrink = '0';
      writeAttribute(element, 'style', element.getAttribute('style'), original);
    }
    if (element.matches('[role="article"][aria-label="User message"]')) {
      writeAttribute(element, 'aria-label', '用户消息', 'User message');
    }
    if (element.matches('[role="article"][aria-label="Agent response"]')) {
      writeAttribute(element, 'aria-label', '智能体回复', 'Agent response');
    }
    if (!isConversationContent(element)) {
      translateSplitNoPhrase(element);
      translateArchivedNotification(element);
      translatePluginMarkdownContent(element);
    }
    // Translate UI metadata on editable controls, without touching their value or
    // editable descendants. Authored titles/alt text inside messages stay intact.
    if (isConversationContent(element)) return;
    updateThemePresetTooltip(element);
    if (element.matches('[data-testid="plan-command-fyi-alert"]')) {
      const icon = element.querySelector("svg");
      if (icon) {
        for (const [attribute, text] of [
          ["title", "在输入框中输入 / 并选择 plan，可让代理先生成计划再执行任务。若只想生成计划，也可以直接输入 /plan。"],
          ["aria-label", "计划模式使用说明"],
        ]) {
          const value = icon.getAttribute(attribute);
          const record = elementOriginals.get(icon)?.get(attribute);
          writeAttribute(icon, attribute, text, record && value === record.applied ? record.original : value);
          elementOriginals.get(icon)?.get(attribute) && (elementOriginals.get(icon).get(attribute).literal = true);
        }
        icon.style.removeProperty("cursor");
      }
    }
    for (const attribute of translatableAttributes) {
      if (!element.hasAttribute(attribute)) continue;
      const current = element.getAttribute(attribute);
      const record = elementOriginals.get(element)?.get(attribute);
      if (record?.literal && current === record.applied) continue;
      const original = record && current === record.applied ? record.original : current;
      const fileTab = element.closest('button[data-tab-id^="file__"]');
      const fileLabel = fileTab && attribute === 'title' && (element === fileTab || element.matches('div.whitespace-nowrap[title]'));
      const imageLabel = attribute === 'alt' && element.matches('img[draggable="false"].object-contain') &&
        element.closest('[role="region"][aria-label="File Viewer"], [role="region"][aria-label="文件查看器"]') && original?.startsWith('Image: ');
      const next = fileLabel ? translateFileTabLabel(fileTab, original) : imageLabel ? original.replace(/^Image: /, '图片：') :
        statusRegion(element) && (element.closest(statusTitleSelector) || element.matches(statusControlSelector)) ? translateStatusLabel(original) : translateValue(original);
      writeAttribute(element, attribute, next, original);
    }
  }
  const rootFilter = {
    acceptNode(node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return NodeFilter.FILTER_ACCEPT;
      if (node.matches('[data-testid="agent-embed"]')) return NodeFilter.FILTER_ACCEPT;
      if (node.matches('iframe[data-testid="agent-embed-iframe"]') && node.closest('[data-testid="agent-embed"]')) return NodeFilter.FILTER_ACCEPT;
      if (isOpaque(node) || node.parentElement?.isContentEditable ||
          node.parentElement?.closest("textarea")) return NodeFilter.FILTER_REJECT;
      if (node.matches(uiSelector) || node.closest(uiSelector)) return NodeFilter.FILTER_ACCEPT;
      if (node.matches('[role="article"][aria-label="User message"], [role="article"][aria-label="用户消息"], [role="article"][aria-label="Agent response"], [role="article"][aria-label="智能体回复"]')) return NodeFilter.FILTER_ACCEPT;
      if (isConversationContent(node) && !node.querySelector(uiSelector)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  };
  function* nodesIn(root, filtered = true) {
    if (!root) return;
    if (!filtered || root.nodeType !== Node.ELEMENT_NODE || rootFilter.acceptNode(root) !== NodeFilter.FILTER_REJECT) {
      yield root;
      const walker = (root.ownerDocument || document).createTreeWalker(root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, filtered ? rootFilter : null);
      let node;
      while ((node = walker.nextNode())) yield node;
    }
  }
  function restoreNode(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      const record = nodeOriginals.get(node);
      if (record && node.nodeValue === record.applied) node.nodeValue = record.original;
      nodeOriginals.delete(node);
    } else if (node instanceof Element) {
      const saved = elementOriginals.get(node);
      if (saved) for (const [attribute, record] of saved) {
        if (node.getAttribute(attribute) === record.applied) {
          if (record.original === null) node.removeAttribute(attribute);
          else node.setAttribute(attribute, record.original);
        }
      }
      elementOriginals.delete(node);
    }
  }

  const controller = {
    stopped: false, observer: null, timers: new Set(), frames: new Set(), removables: new Set(), badge: null, settingsClick: null, restoreAlert: null,
    stop() {
      this.stopped = true;
      this.observer?.disconnect();
      this.restoreAlert?.();
      if (this.settingsClick) document.removeEventListener('click', this.settingsClick, true);
      for (const id of this.timers) clearTimeout(id);
      for (const id of this.frames) cancelAnimationFrame(id);
      this.timers.clear(); this.frames.clear(); this.badge?.remove();
      for (const element of this.removables) element.remove();
      this.removables.clear();
    },
  };
  window.__antigravityZhPatchController = controller;
  // alert() has no DOM. Limit this hook to a known application message; never
  // translate arbitrary diagnostics or strings from embedded/user content.
  if (typeof window.alert === 'function') {
    const originalAlert = window.alert;
    const patchedAlert = function (...args) {
      if (!controller.stopped && args[0] === 'Configuration saved successfully!') args[0] = translateValue(args[0]);
      return originalAlert.apply(this, args);
    };
    window.alert = patchedAlert;
    controller.restoreAlert = () => { if (window.alert === patchedAlert) window.alert = originalAlert; };
  }
  function schedule(callback) {
    let done = false, frame, timer;
    const run = () => {
      if (done) return;
      done = true;
      if (timer !== undefined) { clearTimeout(timer); controller.timers.delete(timer); }
      if (frame !== undefined) { cancelAnimationFrame(frame); controller.frames.delete(frame); }
      if (!controller.stopped) callback();
    };
    if (typeof requestAnimationFrame === "function") {
      frame = requestAnimationFrame(run); controller.frames.add(frame);
    }
    timer = setTimeout(run, 50); controller.timers.add(timer);
  }
  const contextMenuLabels = new Set([
    'Copy', 'Cut', 'Paste', 'Select All', 'Undo', 'Redo', 'Rename', 'Pin', 'Unpin',
    'Mark Read', 'Mark Unread', 'Archive', 'Restore', 'Delete', 'Delete Permanently',
    'Fork', 'Split', 'Share', 'Stop', 'View Debug', 'Telemetry', 'Move to Group',
    'New Group', 'Remove from Group', 'Rename Group', 'Delete Group', 'Move Up', 'Move Down',
    'Sort By', 'Last Updated', 'Last Prompt', 'Custom Order',
    'Copy Project Name', 'Copy Workspace Name', 'Copy Worktree Name',
    'Project Settings', 'Workspace Settings', 'Worktree Settings',
    'Delete Project', 'Delete Workspace', 'Delete Worktree',
    'Archive Project', 'Archive Workspace', 'Archive Worktree',
    'Show in File Explorer', 'Reveal in Finder', 'Show in Finder', 'Open in File Manager',
    'Open in Cider', 'Conversation Name', 'Conversation ID', 'Trajectory ID',
    'Project Name', 'Workspace Name', 'Worktree Name',
    'Copy Conversation ID', 'Copy Conversation Name', 'Copy Trajectory ID',
    'Copy Link', 'Copy Path', 'Copy Relative Path', 'Open Link', 'Open in Browser',
    'Open in New Tab', 'Open in New Window', 'Open in New Conversation',
    'Split Right', 'Split Down', 'Replace with New', 'Remove from Split', 'New Conversation',
    'Copy Image', 'Close Tab', 'Close Other Tabs', 'Close Tabs to the Right',
    'New Project', 'New Workspace', 'Create Project', 'Create Cloud Project', 'Quick Start',
    'Group By Workspace', 'Group By Project', 'Undo to Here', 'Mention', 'Copy debug info',
    'About', 'Check for Updates', 'Command Palette', 'Toggle Fullscreen',
    'Zoom In', 'Zoom Out', 'Reset Zoom', 'Minimize', 'Maximize', 'Close',
    'Save Video', 'Save Image', 'Open in Tab', 'New Tab', 'See more results',
    'Delete Hook', 'Add Hook Card', 'Delete Handler', 'Show Terminal', 'Hide Terminal',
    'Open Link in New Tab', 'Open Link in External Browser', 'Copy Link Address',
    'Open Image in New Tab', 'Copy Image Address', 'Open in External Browser',
    'Back', 'Forward', 'Reload', 'Copy Message', 'Fork in Current Workspace',
    'Fork in Shared Workspace', 'Fork in New Workspace', 'New Remote Project',
    'Toggle Status Bar', 'Give Feedback', 'Pin Tab', 'Unpin Tab',
    'Add to Chat', 'Copy File Path', 'Copy File Name',
    'Send Message', 'Queue Message', 'Send Immediately',
  ]);
  function installNotificationHooks() {
    const translateMenuItem = (label, item) => {
      if (controller.stopped || typeof label !== 'string') return label;
      if (item?.type === 'checkbox' && typeof item.id === 'string' && item.id.startsWith('group-')) return label;
      return contextMenuLabels.has(label) && translations.has(label) ? translations.get(label) : label;
    };
    const currentMap = Array.prototype.map;
    if (currentMap.__antigravityZhMenuHook) {
      currentMap.__antigravityZhMenuHook.translateMenuItem = translateMenuItem;
    } else {
      const menuDelegate = { translateMenuItem };
      const patchedMap = function (callback, thisArg) {
        const res = currentMap.call(this, callback, thisArg);
        if (res.length > 0) {
          const first = res[0];
          if (first && typeof first === 'object' && 'accelerator' in first && 'label' in first && 'id' in first &&
              (('checked' in first && 'disabled' in first && 'type' in first) || ('enabled' in first && 'click' in first))) {
            for (let i = 0; i < res.length; i++) {
              const item = res[i];
              if (item && typeof item === 'object' && typeof item.label === 'string') {
                item.label = menuDelegate.translateMenuItem(item.label, item);
              }
            }
          }
        }
        return res;
      };
      Object.defineProperty(patchedMap, '__antigravityZhMenuHook', { value: menuDelegate });
      Object.defineProperty(Array.prototype, 'map', {
        value: patchedMap,
        writable: true,
        configurable: true,
        enumerable: false,
      });
    }
    const translateNotification = value => controller.stopped ? value : translateValue(value);
    const localizeNotification = opts => {
      if (controller.stopped || !opts || typeof opts !== 'object') return opts;
      const next = { ...opts };
      if (typeof opts.title === 'string') next.title = translateNotification(opts.title);
      if (typeof opts.body !== 'string') return next;
      // YEa / lGa uses the application name as title and the authored conversation
      // summary as body. Its id (Web Notification: tag) identifies completion.
      const id = opts.id ?? opts.tag;
      if (typeof id === 'string' && id.startsWith('agent-finished-')) {
        const summary = opts.body.replace(/^Agent finished:\s*/, '');
        next.body = summary && summary !== 'Agent finished' ? `任务已完成：${summary}` : '任务已完成';
      } else {
        const prefix = {
          'Requesting your permission in Terminal:': ['Command: ', '命令：'],
          'Requesting your permission to execute JavaScript:': ['Code: ', '代码：'],
          'Requesting your permission to open URL:': ['URL: ', '网址：'],
        }[opts.title];
        if (prefix) next.body = opts.body.startsWith(prefix[0]) ? prefix[1] + opts.body.slice(prefix[0].length) : opts.body;
        else if (/^The agent has (?:a question|questions) for you:$/.test(opts.title))
          next.body = /^Click to respond to the questions?\.$/.test(opts.body) ? translateNotification(opts.body) : opts.body;
        else if (opts.title === 'Requesting your permission:') next.body = opts.body;
        else next.body = translateNotification(opts.body);
      }
      return next;
    };
    function hookNative(target) {
      if (!target) return target;
      if (target.__antigravityZhHooked?.localize) {
        target.__antigravityZhHooked.translate = translateNotification;
        target.__antigravityZhHooked.localize = localizeNotification;
        return target;
      }
      // v62 bridges only expose translate. Their stopped wrapper passes through
      // unchanged, so one new wrapper upgrades them to options-aware translation.
      const originalSend = target.send;
      if (typeof originalSend === 'function') {
        const delegate = { translate: translateNotification, localize: localizeNotification };
        try {
          target.send = function (opts) {
            if (opts && typeof opts === 'object') {
              return originalSend.call(this, delegate.localize(opts));
            }
            return originalSend.apply(this, arguments);
          };
          target.__antigravityZhHooked = delegate;
        } catch (_) {}
      }
      return target;
    }

    let currentNative = window.nativeNotifications;
    if (currentNative) hookNative(currentNative);
    try {
      Object.defineProperty(window, 'nativeNotifications', {
        configurable: true,
        enumerable: true,
        get() { return currentNative; },
        set(val) { currentNative = hookNative(val); }
      });
    } catch (_) {}

    const OriginalNotification = window.Notification;
    if (typeof OriginalNotification === 'function') {
      if (OriginalNotification.__antigravityZhNotificationHook) {
        OriginalNotification.__antigravityZhNotificationHook.localize = localizeNotification;
        return;
      }
      const delegate = { localize: localizeNotification };
      const PatchedNotification = function (title, options) {
        const localized = delegate.localize({ ...(options || {}), title });
        let transOptions;
        if (options && typeof options === 'object') {
          const { title: ignored, ...rest } = localized;
          transOptions = rest;
        } else transOptions = options;
        return Reflect.construct(OriginalNotification, [localized.title, transOptions], new.target || PatchedNotification);
      };
      PatchedNotification.prototype = OriginalNotification.prototype;
      Object.setPrototypeOf(PatchedNotification, OriginalNotification);
      PatchedNotification.__antigravityZhNotificationHook = delegate;
      window.Notification = PatchedNotification;
    }
  }
  installNotificationHooks();

  function start() {
    if (controller.stopped) return;
    installNotificationHooks();
    if (!document.documentElement) {
      addEventListener("DOMContentLoaded", start, { once: true }); return;
    }
    controller.settingsClick = event => {
      const tab = event.target instanceof Element && event.target.closest('[data-testid^="settings-nav-item-"]');
      if (!tab || tab.classList.contains('bg-sidebar-secondary')) return;
      const dialog = tab.closest('[role="dialog"]');
      if (!dialog) return;
      schedule(() => {
        const scroller = dialog.querySelector('.flex.h-full.overflow-auto');
        if (scroller) scroller.scrollTop = 0;
      });
    };
    document.addEventListener('click', controller.settingsClick, true);
    const roots = new Set(), texts = new Set();
    let scheduled = false, job = null, initialPending = true;
    const clock = () => performance.now();
    function queueRoot(root) {
      if (!root?.isConnected) return;
      for (let parent = root.parentNode; parent; parent = parent.parentNode) if (roots.has(parent)) return;
      // Discard queued descendants when their ancestor arrives afterwards.
      for (const other of roots) if (root.contains(other)) roots.delete(other);
      for (const text of texts) if (root.contains(text)) texts.delete(text);
      roots.add(root);
    }
    function queueText(text) {
      if (!text?.isConnected) return;
      for (let parent = text.parentNode; parent; parent = parent.parentNode) if (roots.has(parent)) return;
      texts.add(text);
    }
    function requestDrain() {
      if (scheduled || controller.stopped) return;
      scheduled = true;
      // MutationObserver runs before paint. Keep continuations in that same
      // microtask checkpoint: yielding to a frame/timer exposes English UI.
      queueMicrotask(drain);
    }
    function* translationJob(root) {
      // Recompute directly from saved originals, without an English restore
      // pass. Visit protected nodes too so reused UI and old patch records can
      // be restored when their context becomes authored content.
      yield* nodesIn(root, false);
    }
    function completeInitial() {
      initialPending = false;
      document.documentElement.lang = "zh-CN";
      window.__antigravityZhPatchVersion = patchVersion;
      window.__antigravityZhPatchDictionarySize = translations.size;
      window.__antigravityZhPatchGuard = guard;
      window.__antigravityZhPatchInstalled = true;
      showBadge();
    }
    function drain() {
      scheduled = false;
      if (controller.stopped) return;
      const deadline = clock() + 8;
      let count = 0;
      while (!controller.stopped && count < 400 && clock() < deadline) {
        if (!job) {
          if (texts.size) {
            const text = texts.values().next().value; texts.delete(text);
            if (text.isConnected) translateTextNode(text);
            count++; continue;
          }
          if (!roots.size) break;
          const root = roots.values().next().value; roots.delete(root);
          if (!root.isConnected) continue;
          job = translationJob(root);
        }
        const next = job.next();
        if (next.done) {
          job = null;
          if (initialPending) completeInitial();
          continue;
        }
        const node = next.value;
        if (node.isConnected) {
          if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
          else {
            if (isOpaque(node) || isConversationContent(node) || node.matches(identitySelector)) restoreNode(node);
            translateElement(node);
          }
        }
        count++;
      }
      if (job || roots.size || texts.size) requestDrain();
    }
    controller.observer = new MutationObserver(mutations => {
      for (const [source, record] of detailViews) {
        if (!source.isConnected || !record.view.isConnected) {
          removeDetailView(source, record);
          if (source.isConnected) queueRoot(source);
        }
      }
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          const record = nodeOriginals.get(mutation.target);
          if (!record || mutation.target.nodeValue !== record.applied) { invalidateDetail(mutation.target); queueText(mutation.target); }
        } else if (mutation.type === "attributes") {
          const record = elementOriginals.get(mutation.target)?.get(mutation.attributeName);
          if (!record || mutation.target.getAttribute(mutation.attributeName) !== record.applied) { invalidateDetail(mutation.target); queueRoot(mutation.target); }
        } else for (const node of mutation.addedNodes) {
          invalidateDetail(mutation.target);
          if (node.nodeType === Node.TEXT_NODE) queueText(node);
          else queueRoot(node);
        }
      }
      if (texts.size || roots.size) requestDrain();
    });
    controller.observer.observe(document.documentElement, {
      subtree: true, childList: true, characterData: true, attributes: true,
      attributeFilter: [...translatableAttributes, "class", "contenteditable", "data-testid", "data-antigravity-user-content"],
    });
    window.__antigravityZhPatchObserver = controller.observer;
    function showBadge() {
      if (!document.body || controller.stopped) return;
      const badge = document.createElement("div");
      badge.textContent = "中文补丁已加载";
      Object.assign(badge.style, { position: "fixed", right: "16px", bottom: "16px", zIndex: "2147483647",
        padding: "8px 12px", borderRadius: "8px", color: "white", background: "rgba(25,110,65,.92)",
        font: "13px system-ui,sans-serif", pointerEvents: "none" });
      controller.badge = badge; document.body.appendChild(badge);
      const timer = setTimeout(() => { badge.remove(); controller.timers.delete(timer); }, 3500);
      controller.timers.add(timer);
    }
    window.__antigravityZhPatchRestore = () => {
      controller.stop(); window.__antigravityZhPatchInstalled = false; window.__antigravityZhPatchGuard = null;
      let count = 0;
      for (const [source, record] of detailViews) removeDetailView(source, record);
      for (const node of nodesIn(document.documentElement, false)) { restoreNode(node); count++; }
      return count;
    };
    job = translationJob(document.documentElement); requestDrain();
  }
  start();
})();
