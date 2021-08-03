(function(){
	

	
	window.zm = window.zm || {};
	/*
	****************************************************************
							定义全局变量
	****************************************************************					
	 */
	window.zm.cgiBinUrl = '/zm/cgi-bin/nph-zms';
	window.zm.streamUrl = '/zm/index.php';
	//window.zm.reqUrl = '/apps/surveillance/includes/zm.php';
	window.zm.reqUrl = '/zm/api/';
	window.zm.auth = getCookie("credentials");
	window.zm.access_token=getCookie("access_token");
	window.zm.refresh_token=getCookie("refresh_token");
	window.zm.username=getCookie("username");
	
	window.zm.access_token_expires=getCookie("access_token_expires");
	window.zm.refresh_token_expires=getCookie("refresh_token_expires");
	//计算access_token超时时间（预留5分钟）
	var _tokenExpiresTime = new Date().getTime()+window.zm.access_token_expires*1000-5*60*1000;
	//计算refresh_token超时时间（预留5分钟）
	var _tokenRefreshExpiresTime = new Date().getTime()+window.zm.refresh_token_expires*1000-5*60*1000;
	var _tokenCheckInterval = setInterval(function(){
		tokenCheckInterval();
	},60000);
	function tokenCheckInterval(){
		var currentTime = new Date().getTime();
		if(currentTime > _tokenRefreshExpiresTime){
			//refresh_token超时，重新登录
			window.location.href="login.html"+location.search;
		}else{
			if(currentTime > _tokenExpiresTime){
				//access_token超时，刷新access_token
				refreshToken();
			}
		}
	}
	tokenCheckInterval();
	/*
	****************************************************************
							定义全局函数
	****************************************************************					
	 */
	//用户点击  左侧预览-右侧某一视频图像右上角编辑时调用
	window.zm.showEditMonitorComprehensive=function(comprehensiveData){
		$("#operateType").val("edit");
		//根据传过来的参数初始化监视器的配置面板并显示
		//console.log(comprehensiveData);
		initMointorComprehensiveData(comprehensiveData.Monitor);
	};
	//用户点击添加监视器时调用并初始化基本配置信息
	window.zm.showAddMonitorComprehensive=function(simpleData){
		//根据传过来的参数初始化监视器的配置面板并显示
		//console.log(simpleData);
		$("#operateType").val("add");
		initMointorSimpleData(simpleData);
	};
	
	//获取当前所在页面名称
	window.zm.getCurrentPage = getCurrentPage;
	function getCurrentPage(){
		return $(".left-tab.active").data('ref');
	}
	//刷新access_token
	window.zm.refreshToken = refreshToken;
	function refreshToken(){
		if(_tokenCheckInterval){
			clearInterval(_tokenCheckInterval);
		}
		
		$.ajax({
			url: "/zm/api/host/login.json?token="+window.zm.refresh_token,
			type: "GET",
			dataType: "json",
			async: true,
			success: function(data){
				//console.log(data);
				if(data && data.access_token){
					setCookie("access_token",data.access_token,data.access_token_expires);
					setCookie("credentials",data.credentials,data.access_token_expires);
					window.zm.auth = data.credentials;
					window.zm.access_token = data.access_token;
					
					//重新计算access_token超时时间（预留5分钟）
					_tokenExpiresTime = new Date().getTime()+window.zm.access_token_expires*1000-5*60*1000;
					
					//获取到新的access_token后，刷新当前页面
					window.zm.update[getCurrentPage()]();
				}else{
					//console.log('Refresh token failed. Redirected to login page.');
					window.location.href="login.html"+location.search;
				}
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log('Refresh token error. Redirected to login page.');
				window.location.href="login.html"+location.search;
			}
		});
	};
	
	//翻译函数，翻译优先级url-config-cookie
	window.zm.languageTranslation=languageTranslation;
	function languageTranslation(){
		var paramLanguage = getParameterURL("language");
		if(paramLanguage){
			//如果跳转URL中带语言参数，则设置为对应语言
			if(paramLanguage=="cn"){
				window.unasTranslation('简体中文');
			}else{
				window.unasTranslation('English');
			}
			//设置配置选项中语言的值
			window.zm.setConfigLanguage(myUNAS.CurrentLanguage);
		}
		else{
			//设置为 当前配置选项中语言的值
		    var configLanguage = window.zm.getConfigLanguage();
		    window.unasTranslation(configLanguage);
		}
	}

	//在login的图片下方显示当前登录人的名称
	$("#username").text(window.zm.username);
	

	//注册页面翻译函数
	window.addTranslationEvent(function(){
		
	});
	
	//加载翻译文件
	myUNAS.LoadTranslation("./languages/Translation.json",function(){
		//翻译优先级：url-config-cookie
		var paramLanguage = getParameterURL("language");
		if(paramLanguage){
			//如果跳转URL中带语言参数，则设置为对应语言
			if(paramLanguage=="cn"){
				window.unasTranslation('简体中文');
			}else{
				window.unasTranslation('English');
			}
			//设置配置选项中语言的值
			window.zm.setConfigLanguage(myUNAS.CurrentLanguage);
		}else{
			//读取配置选项和cookie中语言的值
			var configLanguage=window.zm.getConfigLanguage;
			var cookieLanguage = getCookie("language");
			if(configLanguage){
				window.unasTranslation(configLanguage);
			}
			else if(cookieLanguage){
				//如果cookie中获取到语言参数，则设置为对应语言
				if(cookieLanguage=="cn"){
					window.unasTranslation('简体中文');
				}else{
					window.unasTranslation('English');
				}
			}
			else{
				//默认显示英文
				window.unasTranslation('English');
			}
		}
		
		$("body").show();
	});	
	

	/*
	****************************************************************
								事件
	****************************************************************					
	 */
	
	var $mainContainer = $('#main_container');
	//index页面左侧状态栏点击事件
	$(".left-tab").on("click",function(){
		if($(this).hasClass('active')) return;
		
		var lastPage = $(".left-tab.active").data('ref');
		window.zm.destroy[lastPage]();
		
		//执行前重置所有图片为正常状态,移除active样式，方便后面切换
		$(".left-tab").find("img").attr("src",function(index,value){
			return value.replace("_pressed.","_normal.");
		});
		$(".left-tab").removeClass("active");

		//为被点击的元素添加active样式
		$(this).addClass("active");
		//将点击的元素图片设置成激活状态的图片
		$(this).find("img").attr("src",function(index,value){
			return value.replace("_normal.","_pressed.");
		});

		var page = $(this).data('ref');
		//console.log('load page:'+page);
		$mainContainer.load(page+'.html', function(response, status, xhr){
			window.zm.init[page]();
		});
	});
	$mainContainer.load('monitor.html', function(response, status, xhr){
		window.zm.init['monitor']();
	});
	
	//点击监视器配置面板的选项卡执行的事件,用于切换选项卡对应的内容
	$(".monitor-config-content-ul li").on("click",function(){
		$(".monitor-config-content-ul li").removeClass("active");
		$(this).addClass("active");

		var sourceType=$("[id='newMonitor[Type]']").val();
		sourceType=sourceType.replace(sourceType[0],sourceType[0].toLowerCase());
		//切换选项卡对应的内容
		//Source选项卡内容比较特殊，会受到General内容中Source Type项影响,这里特殊处理
		//显示前,先隐藏所有选项卡内容
		$(".monitor-config-content-table").addClass("hide");
		if(this.id=="monitor-config-content-ul-source"){
			$("#monitor-config-content-table-"+sourceType+"-source").removeClass("hide");
		}
		else{
			$("table[ref="+this.id+"]").removeClass("hide");
		}


		//Source面板中Source Type项选择Ffmpeg对其他选项卡内容的影响
		if(sourceType=="ffmpeg"){
			$("[id='newMonitor[RecordAudio]']").removeClass("hide");
			$("[id='newMonitor[RecordAudio]Description']").addClass("hide");
		}
		else{
			$("[id='newMonitor[RecordAudio]']").addClass("hide");
			$("[id='newMonitor[RecordAudio]Description']").removeClass("hide");
		}
	});
	//监视器配置面板设置滚动条
	$(".monitor-config-content-table-srcoll").mCustomScrollbar({
		autoHideScrollbar:false,
	  	theme:"minimal-dark"
	});
	//监视器配置面板选项卡为Source中的Capture Resolution (pixels)项的change事件
	//将所有newMonitor获取到一起注册事件,根据前缀区分操作对象
	//local-newMonitor[Width]
	//remote-newMonitor[Width]
	//file-newMonitor[Width]
	//ffmpeg-newMonitor[Width]
	//libvlc-newMonitor[Width]
	//cUrl-newMonitor[Width]
	$("[id$='newMonitor[Width]'],[id$='newMonitor[Height]']").on("input",function(e){
		var value="";
		//获取当前id前缀表明当前操作的面板
		var pre=this.id.split("-")[0];
		if(this.id.indexOf("newMonitor[Width]")>0){
			value=this.value+"x"+$("[id='"+pre+"-newMonitor[Height]']").val();
		}else{
			value=$("[id='"+pre+"-newMonitor[Width]']").val()+"x"+this.value;
		}

		if($("#"+pre+"-dimensions_select option[value="+value+"]").length>0){
			$("#"+pre+"-dimensions_select").val(value);
		}
		else{
			$("#"+pre+"-dimensions_select").val("");
		}
	});
	$("[id$='dimensions_select']").on("change",function(e){
		//获取当前id前缀表明当前操作的面板
		var pre=this.id.split("-")[0];
		var strArr=this.value.split("x");
		$("[id='"+pre+"-newMonitor[Width]']").val(strArr[0]);
		$("[id='"+pre+"-newMonitor[Height]']").val(strArr[1]);
	});

	//监视器配置面板选项卡为Misc, Signal Check Colour项与Web Colour项变化事件
	$("input[name='newMonitor[SignalCheckColour]']").on("input",function(e){
		$('#SignalCheckSwatch').css('background-color', e.target.value);
	});
	$("input[name='newMonitor[WebColour]']").on("input",function(e){
		$('#WebSwatch').css('background-color', event.target.value);
	});
	//web colour最右侧图标事件（随机颜色）
	$("#randomColorIcon").on("click",function(){
		var letters = '0123456789ABCDEF';
		var colour = '#';
		for (var i = 0; i < 6; i++) {
			colour += letters[Math.floor(Math.random() * 16)];
		}
		$('input[name="newMonitor[WebColour]"]').val(colour);
		$('#WebSwatch').css(
		  'backgroundColor', colour
		);
	});

	$("[id='newMonitor[Type]']").on("change",function(){
		if(this.value=="Ffmpeg"){
			$("[id='newMonitor[VideoWriter]'] option[value='2']").removeAttr("disabled");
		}
		else{
			$("[id='newMonitor[VideoWriter]'] option[value='2']").prop("disabled","true");
			$("[id='newMonitor[VideoWriter]']").val("0");
		}
	});
	


	//点击'注销'按钮显示退出确认界面
	$("#btn_logout").on("click",function(){
		$("#popup_logout").show();
	});
	//退出确认界面的2个按钮事件
	$("#confirmBtn").on("click",function(){
		logout();
	});
	$("#cancelBtn").on("click",function(){
		$('#popup_logout').hide();
	});

	//点击监视器高级选项中的保存按钮
	$("#mointer-saveBtn").on("click",function(){
		var Name=$("[id='newMonitor[Name]']").val();
		if(Name.indexOf(" ")>=0){
			promptShow("监视器名称不能有空格");
			return;
		}
		
		saveMonitorData();
	});

	function logout(){
		//组织请求参数
		// var _data = JSON.stringify({ 
		// 							cmd:"logout",
		// 							params:{
		// 								auth:window.zm.auth
		// 							}
		// 						});
		// $.ajax({
		// 	url: window.zm.reqUrl,
		// 	type: "POST",
		// 	dataType: "json",
		// 	async: true,
		// 	data: _data,
		// 	timeout: 30000,
		// 	success: function(data){
		// 		if(data.err==0){
		// 			setCookie("username","");
		// 			setCookie("credentials","");
		// 			window.location.href="login.html";
		// 		}
		// 		else{
		// 			//console.log(data);
		// 		}
				
		// 	},
		// 	error:function(xhr, ajaxOptions, thrownError){
		// 	}
		// });
		
		//未提供注销接口，退出直接清空cookie即可
		setCookie("username","");
		setCookie("credentials","");
		setCookie("access_token","");
		setCookie("refresh_token","");
		window.location.href="login.html"+location.search;
	}

	//监视器配置面板中，高级选项的数据初始化
	function initMointorComprehensiveData(comprehensiveData){
		//单选框，复选框操作方式与文本框下拉框有所不同
		
		//赋监视器id
		$("[id='newMonitor[Id]']").val(comprehensiveData.Id);
		
		//设置左上角标题
		$("#monitorTitle").text(comprehensiveData.Name);
		//General面板
		$("[id='newMonitor[Name]']").val(comprehensiveData.Name);
		$("[id='newMonitor[Notes]']").val(comprehensiveData.Notes);
		$("[id='newMonitor[Server]']").val(comprehensiveData.ServerId);
		$("[id='newMonitor[Type]']").val(comprehensiveData.Type);
		$("[id='newMonitor[Type]']").trigger("change");
		$("[id='newMonitor[Function]']").val(comprehensiveData.Function);
		if(comprehensiveData.Enabled=="1"){
			$("[id='newMonitor[Enabled]']").attr("checked",true);
		}
		$("[id='newMonitor[LinkedMonitors][]']").val(comprehensiveData.LinkedMonitors);
		//$("[id='newMonitor[GroupIds][]']").val(comprehensiveData.GroupIds);
		$("[id='newMonitor[AnalysisFPSLimit]']").val(comprehensiveData.AnalysisFPSLimit);
		$("[id='newMonitor[MaxFPS]']").val(comprehensiveData.MaxFPS);
		$("[id='newMonitor[AlarmMaxFPS]']").val(comprehensiveData.AlarmMaxFPS);
		$("[id='newMonitor[RefBlendPerc]']").val(comprehensiveData.RefBlendPerc);
		$("[id='newMonitor[AlarmRefBlendPerc]']").val(comprehensiveData.AlarmRefBlendPerc);
		//Source面板中的元素id获取需要加上General面板的Source Type值作为前缀
		var type=$("[id='newMonitor[Type]']").val();
		type=type.replace(type[0],type[0].toLowerCase());
		$("[id='"+type+"-newMonitor[Device]']").val(comprehensiveData.Device);
		$("[id='"+type+"-newMonitor[Method]']").val(comprehensiveData.Method);
		$("[id='"+type+"-newMonitor[Channel]']").val(comprehensiveData.Channel);
		$("[id='"+type+"-newMonitor[Format]']").val(comprehensiveData.Format);
		$("[id='"+type+"-newMonitor[Palette]']").val(comprehensiveData.Palette);
		$("input[name='"+type+"-newMonitor[V4LMultiBuffer]'][value='"+comprehensiveData.V4LMultiBuffer+"']").attr("checked",true);
		$("[id='"+type+"-newMonitor[V4LCapturesPerFrame]']").val(comprehensiveData.V4LCapturesPerFrame);
		$("[id='"+type+"-newMonitor[Colours]']").val(comprehensiveData.Colours);
		$("[id='"+type+"-newMonitor[Width]']").val(comprehensiveData.Width);
		$("[id='"+type+"-newMonitor[Height]']").val(comprehensiveData.Height);
		//$("[id='"+type+"-dimensions_select']").val(comprehensiveData.dimensions_select);
		//触发其input事件为dimensions_select元素赋值
		$("[id='"+type+"-newMonitor[Height]']").trigger("input");
		if(comprehensiveData.preserveAspectRatio=="1"){
			$("[id='"+type+"-newMonitor[preserveAspectRatio]']").attr("checked",true);
		}
		$("[id='"+type+"-newMonitor[Orientation]']").val(comprehensiveData.Orientation);
		$("[id='"+type+"-newMonitor[Deinterlacing]']").val(comprehensiveData.Deinterlacing);
		$("[id='"+type+"-newMonitor[Protocol]']").val(comprehensiveData.Protocol);
		$("[id='"+type+"-newMonitor[Host]']").val(comprehensiveData.Host);
		$("[id='"+type+"-newMonitor[Port]']").val(comprehensiveData.Port);
		$("[id='"+type+"-newMonitor[Path]']").val(comprehensiveData.Path);
		if(comprehensiveData.RTSPDescribe=="1"){
			$("[id='"+type+"-newMonitor[RTSPDescribe]']").attr("checked",true);
		}
		$("[id='"+type+"-newMonitor[Options]']").val(comprehensiveData.Options);
		$("[id='"+type+"-newMonitor[DecoderHWAccelName]']").val(comprehensiveData.DecoderHWAccelName);
		$("[id='"+type+"-newMonitor[DecoderHWAccelDevice]']").val(comprehensiveData.DecoderHWAccelDevice);
		$("[id='"+type+"-newMonitor[User]']").val(comprehensiveData.User);
		$("[id='"+type+"-newMonitor[Pass]']").val(comprehensiveData.Pass);
		$("[id='"+type+"-newMonitor[Refresh]']").val(comprehensiveData.Refresh);

		//Storage面板
		$("[id='newMonitor[StorageId]']").val(comprehensiveData.StorageId);
		$("[id='newMonitor[SaveJPEGs]']").val(comprehensiveData.SaveJPEGs);
		$("[id='newMonitor[VideoWriter]']").val(comprehensiveData.VideoWriter);
		$("[id='newMonitor[EncoderParameters]']").val(comprehensiveData.EncoderParameters);
		$("[id='newMonitor[RecordAudio]']").val(comprehensiveData.RecordAudio);
		if(comprehensiveData.LabelFormat!=""){
			$("[id='newMonitor[LabelFormat]']").val(comprehensiveData.LabelFormat);
		}
		$("[id='newMonitor[LabelX]']").val(comprehensiveData.LabelX);
		$("[id='newMonitor[LabelY]']").val(comprehensiveData.LabelY);
		$("[id='newMonitor[ImageBufferCount]']").val(comprehensiveData.ImageBufferCount);
		$("[id='newMonitor[WarmupCount]']").val(comprehensiveData.WarmupCount);
		$("[id='newMonitor[PreEventCount]']").val(comprehensiveData.PreEventCount);
		$("[id='newMonitor[PostEventCount]']").val(comprehensiveData.PostEventCount);
		$("[id='newMonitor[StreamReplayBuffer]']").val(comprehensiveData.StreamReplayBuffer);
		$("[id='newMonitor[AlarmFrameCount]']").val(comprehensiveData.AlarmFrameCount);

		//Timestamp面板
		if(comprehensiveData.Controllable=="1"){
			$("[id='newMonitor[Controllable]']").attr("checked",true);
		}
		$("[id='newMonitor[ControlId]']").val(comprehensiveData.ControlId);
		$("[id='newMonitor[ControlDevice]']").val(comprehensiveData.ControlDevice);
		$("[id='newMonitor[ControlAddress]']").val(comprehensiveData.ControlAddress);
		$("[id='newMonitor[AutoStopTimeout]']").val(comprehensiveData.AutoStopTimeout);
		$("[id='newMonitor[TrackMotion]']").val(comprehensiveData.TrackMotion);
		$("[id='newMonitor[TrackDelay]']").val(comprehensiveData.TrackDelay);
		$("[id='newMonitor[ReturnLocation]']").val(comprehensiveData.ReturnLocation);
		$("[id='newMonitor[ReturnDelay]']").val(comprehensiveData.ReturnDelay);

		//Misc面板
		$("[id='newMonitor[EventPrefix]']").val(comprehensiveData.EventPrefix);
		$("[id='newMonitor[SectionLength]']").val(comprehensiveData.SectionLength);
		$("[id='newMonitor[MinSectionLength]']").val(comprehensiveData.MinSectionLength);
		$("[id='newMonitor[FrameSkip]']").val(comprehensiveData.FrameSkip);
		$("[id='newMonitor[MotionFrameSkip]']").val(comprehensiveData.MotionFrameSkip);
		$("[id='newMonitor[AnalysisUpdateDelay]']").val(comprehensiveData.AnalysisUpdateDelay);
		$("[id='newMonitor[FPSReportInterval]']").val(comprehensiveData.FPSReportInterval);
		$("[id='newMonitor[DefaultRate]']").val(comprehensiveData.DefaultRate);
		$("[id='newMonitor[DefaultScale]']").val(comprehensiveData.DefaultScale);
		$("[id='newMonitor[DefaultCodec]']").val(comprehensiveData.DefaultCodec);
		$("[id='newMonitor[SignalCheckPoints]']").val(comprehensiveData.SignalCheckPoints);
		$("[id='newMonitor[SignalCheckColour]']").val(comprehensiveData.SignalCheckColour);
		$("[id='newMonitor[WebColour]']").val(comprehensiveData.WebColour);
		if(comprehensiveData.Exif=="1"){
			$("[id='newMonitor[Exif]']").attr("checked",true);
		}

		popupMonitorShow();
	}

	//监视器高级选项显示，显示前重置样式和数据（由于关闭打开功能是用隐藏和显示实现的，所以用户第一次操作后关闭，第二次打开会保留上次的操作痕迹）
	function popupMonitorShow(){
		//初始显示默认到General选项卡
		$(".monitor-config-content-table").addClass("hide");
		$("#monitor-config-content-table-general").removeClass("hide");
		$(".monitor-config-content-ul li").removeClass("active");
		$("#monitor-config-content-ul-general").addClass("active");
		//重置数据，实际打开页面后会初始化数据，可以不考虑重置数据的问题

		$("#popup_monitor").show();
	}

	function initMointorSimpleData(simpleData){
		//console.log(simpleData);
		//设置左上角标题
		$("#monitorTitle").text(simpleData.Name);
		//General面板
		$("[id='newMonitor[Name]']").val(simpleData.Name);
		$("[id='newMonitor[Type]']").val(simpleData.Type);

		//Source面板中的元素id获取需要加上General面板的Source Type值作为前缀
		var type=simpleData.Type;
		type=type.replace(type[0],type[0].toLowerCase());
		$("[id='"+type+"-newMonitor[Protocol]']").val(simpleData.Protocol);
		$("[id='"+type+"-newMonitor[Method]']").val(simpleData.Method);
		$("[id='"+type+"-newMonitor[User]']").val(simpleData.User);
		$("[id='"+type+"-newMonitor[Pass]']").val(simpleData.Pass);
		$("[id='"+type+"-newMonitor[Host]']").val(simpleData.IP);
		$("[id='"+type+"-newMonitor[Port]']").val(simpleData.Port);
		$("[id='"+type+"-newMonitor[Height]']").val(simpleData.Height||"1080");
		$("[id='"+type+"-newMonitor[Width]']").val(simpleData.Width||"1920");

		$("[id='"+type+"-newMonitor[Height]']").trigger("input");

		$("[id='"+type+"-newMonitor[Port]']").val(simpleData.Port);
		var path=simpleData.Protocol+"://"+simpleData.User+":"+simpleData.Pass+"@"+simpleData.IP+(simpleData.Port?":"+simpleData.Port:"")+"/onvif";
		if(simpleData.Path){
			$("[id='"+type+"-newMonitor[Path]']").val(simpleData.Path);
		}
		else{
			$("[id='"+type+"-newMonitor[Path]']").val(path);
		}
		
		popupMonitorShow();
	}


	function updateMethods(element) {
		var form = element.form;

		var origMethod = form.elements['origMethod'];
		var methodSelector = form.elements['newMonitor[Method]'];
		methodSelector.options.length = 0;
		switch ( element.value ) {
		case 'http' :
		              methodSelector.options[methodSelector.options.length] = new Option("Simple", "simple");
		      if ( origMethod.value == "simple" )
		        methodSelector.selectedIndex = methodSelector.options.length-1;
		                  methodSelector.options[methodSelector.options.length] = new Option("Regexp", "regexp");
		      if ( origMethod.value == "regexp" )
		        methodSelector.selectedIndex = methodSelector.options.length-1;
		                break;
		case 'rtsp' :
		              methodSelector.options[methodSelector.options.length] = new Option( "RTP/Unicast", "rtpUni" );
		      if ( origMethod.value == "rtpUni" )
		        methodSelector.selectedIndex = form.elements['newMonitor[Method]'].options.length-1;
		                  methodSelector.options[methodSelector.options.length] = new Option( "RTP/Multicast", "rtpMulti" );
		      if ( origMethod.value == "rtpMulti" )
		        methodSelector.selectedIndex = form.elements['newMonitor[Method]'].options.length-1;
		                  methodSelector.options[methodSelector.options.length] = new Option( "RTP/RTSP", "rtpRtsp" );
		      if ( origMethod.value == "rtpRtsp" )
		        methodSelector.selectedIndex = form.elements['newMonitor[Method]'].options.length-1;
		                  methodSelector.options[methodSelector.options.length] = new Option( "RTP/RTSP/HTTP", "rtpRtspHttp" );
		      if ( origMethod.value == "rtpRtspHttp" )
		        methodSelector.selectedIndex = form.elements['newMonitor[Method]'].options.length-1;
		          break;
		}
		return true;
	}

	//保存监视器高级选项的配置数据
	function saveMonitorData(){

		//数据校验
		if($("[id='newMonitor[Type]']").val()=="Local"){
			if(!$("[id='local-newMonitor[Format]']").val()){
				promptShow("信号源类型选择本地，则必须填写设备格式");
				return;
			}
		}

		var monitor={};
		//判断监视器是编辑操作还是新增操作，编辑操作则带上监视器Id
		var url=""
		var methodType=""
		if($("#operateType").val()=="edit"){
			monitor.Id=$("[id='newMonitor[Id]']").val();
			url="/zm/api/monitors/"+$("[id='newMonitor[Id]']").val()+".json?token="+window.zm.access_token;
			methodType="PUT";
		}
		else{
			url="/zm/api/monitors.json?token="+window.zm.access_token;
			methodType="POST";
		}
		

		//general面板数据
		monitor.Name=$("[id='newMonitor[Name]']").val();
		monitor.Notes=$("[id='newMonitor[Notes]']").val();
		monitor.ServerId=$("[id='newMonitor[ServerId]']").val();
		monitor.Type=$("[id='newMonitor[Type]']").val();
		monitor.Function=$("[id='newMonitor[Function]']").val();
		if($("[id='newMonitor[Enabled]']").prop("checked")){
			monitor.Enabled="1";
		}
		else{
			monitor.Enabled="0";
		}
		monitor.LinkedMonitors=$("[id='newMonitor[LinkedMonitors][]']").val();
		//monitor.GroupIds=$("[id='newMonitor[GroupIds][]']").val();
		monitor.AnalysisFPSLimit=$("[id='newMonitor[AnalysisFPSLimit]']").val();
		monitor.MaxFPS=$("[id='newMonitor[MaxFPS]']").val();
		monitor.AlarmMaxFPS=$("[id='newMonitor[AlarmMaxFPS]']").val();
		monitor.RefBlendPerc=$("[id='newMonitor[RefBlendPerc]']").val();
		monitor.AlarmRefBlendPerc=$("[id='newMonitor[AlarmRefBlendPerc]']").val();
		//Source面板中的元素id获取需要加上General面板的Source Type值作为前缀
		var type=$("[id='newMonitor[Type]']").val();
		type=type.replace(type[0],type[0].toLowerCase());
		monitor.Device=$("[id='"+type+"-newMonitor[Device]']").val();
		monitor.Method=$("[id='"+type+"-newMonitor[Method]']").val();
		monitor.Channel=$("[id='"+type+"-newMonitor[Channel]']").val();
		monitor.Format=$("[id='"+type+"-newMonitor[Format]']").val();
		monitor.Palette=$("[id='"+type+"-newMonitor[Palette]']").val();
		monitor.V4LMultiBuffer=$("input[name='"+type+"-newMonitor[V4LMultiBuffer]']:checked").val();
		monitor.V4LCapturesPerFrame=$("[id='"+type+"-newMonitor[V4LCapturesPerFrame]']").val();
		monitor.Colours=$("[id='"+type+"-newMonitor[Colours]']").val();
		monitor.Width=$("[id='"+type+"-newMonitor[Width]']").val();
		monitor.Height=$("[id='"+type+"-newMonitor[Height]']").val();
		monitor.dimensions_select=$("[id='"+type+"-dimensions_select']").val();
		if($("[id='"+type+"-newMonitor[preserveAspectRatio]']").prop("checked")){
			monitor.preserveAspectRatio="1";
		}
		else{
			monitor.preserveAspectRatio="0";
		}
		monitor.Orientation=$("[id='"+type+"-newMonitor[Orientation]']").val();
		monitor.Deinterlacing=$("[id='"+type+"-newMonitor[Deinterlacing]']").val();
		monitor.Protocol=$("[id='"+type+"-newMonitor[Protocol]']").val();
		monitor.Host=$("[id='"+type+"-newMonitor[Host]']").val();
		monitor.Port=$("[id='"+type+"-newMonitor[Port]']").val();
		monitor.Path=$("[id='"+type+"-newMonitor[Path]']").val();
		if($("[id='"+type+"-newMonitor[RTSPDescribe]']").prop("checked")){
			monitor.RTSPDescribe="1";
		}
		else{
			monitor.RTSPDescribe="0";
		}
		monitor.Options=$("[id='"+type+"-newMonitor[Options]']").val();
		monitor.DecoderHWAccelName=$("[id='"+type+"-newMonitor[DecoderHWAccelName]']").val();
		monitor.DecoderHWAccelDevice=$("[id='"+type+"-newMonitor[DecoderHWAccelDevice]']").val();
		monitor.User=$("[id='"+type+"-newMonitor[User]']").val();
		monitor.Pass=$("[id='"+type+"-newMonitor[Pass]']").val();
		monitor.Refresh=$("[id='"+type+"-newMonitor[Refresh]']").val();
		//Storage面板
		monitor.StorageId=$("[id='newMonitor[StorageId]']").val();
		monitor.SaveJPEGs=$("[id='newMonitor[SaveJPEGs]']").val();
		monitor.VideoWriter=$("[id='newMonitor[VideoWriter]']").val();
		monitor.EncoderParameters=$("[id='newMonitor[EncoderParameters]']").val();
		monitor.RecordAudio=$("[id='newMonitor[RecordAudio]']").val();
		monitor.LabelFormat=$("[id='newMonitor[LabelFormat]']").val();
		monitor.LabelX=$("[id='newMonitor[LabelX]']").val();
		monitor.LabelY=$("[id='newMonitor[LabelY]']").val();
		monitor.ImageBufferCount=$("[id='newMonitor[ImageBufferCount]']").val();
		monitor.WarmupCount=$("[id='newMonitor[WarmupCount]']").val();
		monitor.PreEventCount=$("[id='newMonitor[PreEventCount]']").val();
		monitor.PostEventCount=$("[id='newMonitor[PostEventCount]']").val();
		monitor.StreamReplayBuffer=$("[id='newMonitor[StreamReplayBuffer]']").val();
		monitor.AlarmFrameCount=$("[id='newMonitor[AlarmFrameCount]']").val();
		//Timestamp面板
		if($("[id='newMonitor[Controllable]']").prop("checked")){
			monitor.Controllable="1";
		}
		else{
			monitor.Controllable="0";
		}
		monitor.ControlId=$("[id='newMonitor[ControlId]']").val();
		monitor.ControlDevice=$("[id='newMonitor[ControlDevice]']").val();
		monitor.ControlAddress=$("[id='newMonitor[ControlAddress]']").val();
		monitor.AutoStopTimeout=$("[id='newMonitor[AutoStopTimeout]']").val();
		monitor.TrackMotion=$("[id='newMonitor[TrackMotion]']").val();
		monitor.TrackDelay=$("[id='newMonitor[TrackDelay]']").val();
		monitor.ReturnLocation=$("[id='newMonitor[ReturnLocation]']").val();
		monitor.ReturnDelay=$("[id='newMonitor[ReturnDelay]']").val();
		//Misc面板
		monitor.EventPrefix=$("[id='newMonitor[EventPrefix]']").val();
		monitor.SectionLength=$("[id='newMonitor[SectionLength]']").val();
		monitor.MinSectionLength=$("[id='newMonitor[MinSectionLength]']").val();
		monitor.FrameSkip=$("[id='newMonitor[FrameSkip]']").val();
		monitor.MotionFrameSkip=$("[id='newMonitor[MotionFrameSkip]']").val();
		monitor.AnalysisUpdateDelay=$("[id='newMonitor[AnalysisUpdateDelay]']").val();
		monitor.FPSReportInterval=$("[id='newMonitor[FPSReportInterval]']").val();
		monitor.DefaultRate=$("[id='newMonitor[DefaultRate]']").val();
		monitor.DefaultScale=$("[id='newMonitor[DefaultScale]']").val();
		monitor.DefaultCodec=$("[id='newMonitor[DefaultCodec]']").val();
		monitor.SignalCheckPoints=$("[id='newMonitor[SignalCheckPoints]']").val();
		monitor.SignalCheckColour=$("[id='newMonitor[SignalCheckColour]']").val();
		monitor.WebColour=$("[id='newMonitor[WebColour]']").val();
		if($("[id='newMonitor[Exif]']").prop("checked")){
			monitor.Exif="1";
		}
		else{
			monitor.Exif="0";
		}
		
		//组织请求参数
		var _data = monitor;
		//console.log(_data);
		//console.log(url);
		//console.log(methodType);
		$.ajax({
			url: url,
			type: methodType,
			dataType: "json",
			async: true,
			data: _data,
			timeout: 30000,
			beforeSend:function(){
				$("#popup_log").show();
			},
			complete:function(){
				$("#popup_log").hide();
			},
			success: function(data){
				//console.log(data);
				promptShow(data.message,function(){
					$("#popup_monitor").hide();
					
					if($("#operateType").val()=="edit"){
						window.zm.updateMonitorEdited(monitor);
					}else{
						window.zm.updateMonitorList();
					}
				});
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log(xhr);
				promptShow(xhr.responseJSON.data.exception.message);
			}
		});
	}
})();


//获取监视器列表
function getMonitorList(callback){
	var _data={};
	jQuery.ajax({
		url: "/zm/api/monitors.json?token="+window.zm.access_token,
		type: "GET",
		async: true,
		dataType: 'json',
		contentType: "application/json;charset=utf-8",
		data: _data,
		success: function (data) {	
			if(data.monitors.length>0){
				callback(data.monitors);
			}else{
				callback([]);
			}	
		},
		error: function(XMLHttpRequest, textStatus, errorThrown){
			//console.log('get monitor_list error textStatus:' + textStatus);
			callback([]);
		}
	});
}

//删除确认弹框
$('#dc_btn_cancel').click(function(e){
	hideConfirmDelete();
});
$('#popup_delete_confirm_close').click(function(e){
	hideConfirmDelete();
});
function hideConfirmDelete(){
	$('#dc_btn_confirm').off();
	$('#popup_delete_confirm').hide();
}
function showConfirmDelete(callback){
	$('#popup_delete_confirm').show();
	
	$('#dc_btn_confirm').click(function(e){
		hideConfirmDelete();
		if(typeof callback=="function"){
			callback();
		}
	});
}
		

//提示框的显示
//参数content为提示的内容
//参数callback为提示内容隐藏后需要一些其他处理的回调函数，如数据更新成功后需要有刷新页面的动作来即时的显示最新的数据
function promptShow(content, callback){
	$("#popup_notice_text").text(myUNAS._(content));
	//注册提示框背景处的点击事件，用户点击后提前关闭提示框并执行回调
	var time;
	$("#popup_notice").on("click",function(){
		clearTimeout(time);
		$("#popup_notice").hide();
		if(typeof callback=="function"){
			callback();
		}
	});
	$("#popup_notice").fadeIn(200,function(){
	    time=setTimeout(function(){
			$("#popup_notice").fadeOut(200,function(){
				if(typeof callback=="function"){
					callback();
				}
			});
		},2000);
	});
}
