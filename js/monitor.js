(function(){
	var _isLocalDebug = getParameterURL('localDebug');
	var _monitorsOriginal = [];
	var _monitors = [];
	var _iptSearchFocus = false; //光标是否停留在搜索框中
	
	var _monitorsLan = []; //局域网内搜索到的监视器列表
	
	var _startGetStatusTimer;
	var REFRESH_INTERVAL = 2000; //获取监视器状态 轮询请求间隔（单位：毫秒）
	var _forceStopStatusTimer = false;
	
	var _currentView = 'page'; //默认初始显示表格页
	
	//表格页视图
	var _num_per_line = 2; //每行显示的监视器个数
	var MARGIN_RIGHT_WIDTH = 20; //监视器元素的右边距
	var _monitorThumbWidth; //表格页视图中的thumb宽度
	var _monitorThumbHeight; //表格页视图中的thumb高度
	
	//slider视图
	var _monitor_ratio = 16/9; //监视器宽高比
	var _monitorSlider;
	var _monitorIndex = -1; //此处不是slider的index，而是slider在_monitor数组中的索引值（因为用户操作，可能会删除_monitor列表中的监视器，所以slider的index和_monitor的index并不总是一一对应的）
	var _monitorThumbSlideHeight = 140;	//slider视图中底部slider中的thumb宽度
	var _monitorThumbSlideWidth; //slider视图中底部slider中的thumb高度
	var _monitorThumbBigsizeWidth;
	var _monitorThumbBigsizeHeight;

	//监视器对象的全局变量,在局域网搜索操作中回到新增监视器面板会保存到该变量中，方便高级选项操作直接取值
	var _monitorObj={}
	
	
	function init(){
		//console.log('init monitor');

		_iptSearchFocus = false;
		_currentView = 'page';
		_num_per_line = 2;
		_monitorIndex = -1;
		
		_monitor_ratio = 16/9;
		_monitorThumbSlideWidth = Math.round(_monitorThumbSlideHeight*_monitor_ratio);
		
		
		
		//'添加监视器'按钮
		$('#monitor_btn_add').click(function(e){
			_monitorObj={};
			showAddMonitorSimple();
		});
		$('#popup_monitor_simple_close').click(function(e){
			hideAddMonitorSimple();
		});
		//简单配置项 弹窗底部'高级模式'按钮
		$('#monitor_btn_advance').click(function(e){
			var Name=$("[id='simple-newMonitor[Name]']").val();
			if(Name.indexOf(" ")>=0){
				promptShow("监视器名称不能有空格");
				return;
			}
			
			if(window.zm.showAddMonitorComprehensive){
				window.zm.showAddMonitorComprehensive(getMonitorDataSimple());
				hideAddMonitorSimple();
			}
		});
		//简单配置项 弹窗底部'保存'按钮
		$('#mointer-simple-saveBtn').click(function(e){
			var Name=$("[id='simple-newMonitor[Name]']").val();
			if(Name.indexOf(" ")>=0){
				promptShow("监视器名称不能有空格");
				return;
			}
			addSimpleMonitor();
		});
		
		
		//'局域网搜索'按钮
		$('#monitor_btn_prob').click(function(e){
			showMonitorProb();
		});
		$('#popup_monitor_prob_close').click(function(e){
			hideMonitorProb();
		});
		$("#popup_monitor_prob_add_close").click(function(e){
			$("#popup_monitor_prob_add_mointor").hide();
		});
		//局域网搜索中的'重新搜索'按钮
		$('#monitor_prob_btn_reprob').click(function(e){
			doGetMonitorLanList();
		});
		//局域网搜索-列表项右侧图标-下一步按钮事件
		$("#monitor-prob-add-button-next").click(function(e){
			//console.log("monitor-prob-add-button-next");
			//输入账号密码点击下一步校验,传入点击的图标DOM参数，获取绑定在元素上摄像机的key
			doLanMonitorInputUserPass();
		});
		//局域网搜索-列表项右侧图标-上一步按钮事件
		$("#monitor-prob-add-button-pre").click(function(e){
			$("#monitor_lan_add_probe2_-2").removeClass("hide");
			$("#monitor_lan_add_probe2_-1").removeClass("hide");
			$("#monitor_lan_add_probe2_0").removeClass("hide");
			$("#monitor_lan_add_probe2_1").addClass("hide");
			$("#monitor_lan_add_probe2_2").addClass("hide");

			$("#monitor-prob-add-button-next").removeClass("hide");
			$("#monitor-prob-add-button-pre").addClass("hide");
			$("#monitor-prob-add-button-save").addClass("hide");
		});
		$("#monitor-prob-add-button-save").click(function(e){
			//console.log("monitor-prob-add-button-save");
			//账号密码通过校验后的第二步流程
			//console.log(lanMonitorArr);
			var monitorData={};
			monitorData.Name=$("#moniter-prob-add-name").val();
			monitorData.User=$("#moniter-prob-add-username").val();
			monitorData.Pass=$("#moniter-prob-add-password").val();
			monitorData.IP=$("#moniter-prob-add-host").val();
			monitorData.Protocol=$("#moniter-prob-add-protocol").val();

			var lanIndex=$("#moniter-prob-add-detected-profiles").val()*1;
			delete lanMonitorArr[lanIndex].Name;
			$.extend(monitorData,lanMonitorArr[lanIndex]);
			showAddMonitorSimpleFromProb(monitorData);
			$("#popup_monitor_prob").hide();
			$("#popup_monitor_prob_add_mointor").hide();

			$("#monitor-prob-add-button-next").removeClass("hide");
			$("#monitor-prob-add-button-save").addClass("hide");
			$("#monitor_lan_add_probe2_1").addClass("hide");
			$("#monitor_lan_add_probe2_2").addClass("hide");
		});
		// $(document).on("click","#monitor-prob-add-button-next",function(){
		// 	//输入账号密码点击下一步校验,传入点击的图标DOM参数，获取绑定在元素上摄像机的key
		// 	doLanMonitorInputUserPass();
		// });
		// $(document).on("click","#monitor-prob-add-button-save",function(){
		// 	//账号密码通过校验后的第二步流程
		// 	//console.log(lanMonitorArr);
		// 	var monitorData={};
		// 	monitorData.Name=$("#moniter-prob-add-name").val();
		// 	monitorData.User=$("#moniter-prob-add-username").val();
		// 	monitorData.Pass=$("#moniter-prob-add-password").val();
		// 	monitorData.IP=$("#moniter-prob-add-host").val();
		// 	monitorData.Protocol=$("#moniter-prob-add-protocol").val();

		// 	var lanIndex=$("#moniter-prob-add-detected-profiles").val()*1;
		// 	delete lanMonitorArr[lanIndex].Name;
		// 	$.extend(monitorData,lanMonitorArr[lanIndex]);
		// 	showAddMonitorSimpleFromProb(monitorData);
		// 	$("#popup_monitor_prob").hide();
		// 	$("#popup_monitor_prob_add_mointor").hide();

		// 	$("#monitor-prob-add-button-next").removeClass("hide");
		// 	$("#monitor-prob-add-button-save").addClass("hide");
		// 	$("#monitor_lan_add_probe2_1").addClass("hide");
		// 	$("#monitor_lan_add_probe2_2").addClass("hide");
		// });

		//'添加'按钮
		$('#monitor_prob_btn_addprob').click(function(e){
			showAddMonitorSimple();
			hideMonitorProb();
		});
		jQuery("#monitor_table_scroll_container").mCustomScrollbar({
			autoHideScrollbar:true,
			theme:"minimal-dark",
			scrollInertia: 200
		});

		//点击添加监视器出现弹框中，对远程协议，远程主机用户名，远程主机密码，远程主机IP，远程主机端口注册input事件，填充到远程路径中
		$("[id='simple-newMonitor[Protocol]'],[id='simple-newMonitor[User]'],[id='simple-newMonitor[Pass]'],[id='simple-newMonitor[IP]'],[id='simple-newMonitor[Port]']").on("input",function(){
			var Protocol=$("[id='simple-newMonitor[Protocol]']").val();
			var User=$("[id='simple-newMonitor[User]']").val();
			var Pass=$("[id='simple-newMonitor[Pass]']").val();
			var IP=$("[id='simple-newMonitor[IP]']").val();
			var Port=$("[id='simple-newMonitor[Port]']").val();
			if(Protocol && User && Pass && IP){
				$("[id='simple-newMonitor[Path]']").val(Protocol+"://"+User+":"+Pass+"@"+IP+(Port?":"+Port:""));
			}else{
				$("[id='simple-newMonitor[Path]']").val("");
			}
		})
		
		
		//'搜索'输入框
		$("#monitor_ipt_search").focus(function(){
			_iptSearchFocus = true;
		});
		$("#monitor_ipt_search").blur(function(){
			_iptSearchFocus = false;
		});
		// $('#monitor_ipt_search').keyup(function(){
			// if(_monitorsOriginal.length == 0){
				// return;
			// }
			// filterMonitors(true);
		// });
		
		//键盘回车
		$('#wrapper_monitor').on('keydown', function(e) {
	        if (!_iptSearchFocus) return;
	        
	        if (13 == e.which) { //enter
	            $('#monitor_btn_search').trigger('click');
	        }
	    });
		//'搜索'按钮
		$('#monitor_btn_search').click(function(e){
			e.stopPropagation();
			
			filterMonitors(true);
		});
		
		//右上方表格视图排版按钮
		$('.zm-btn-vm').click(function(e){
			var $that = $(this);
			if($that.hasClass('active')) return;
			
			$('.zm-btn-vm').removeClass('active');
			$that.addClass('active');
			
			_num_per_line = $that.data('ref');
			updateMonitorSize();
		});

		

		$(window).on('resize',function(){
			updateMonitorSize();
		});
		
		
		//右上方slider视图视频宽高比选择
		$('#monitor_sel_ratio').on('change',function(){
			var value = $(this).val();
			if(value == '16/9'){
				_monitor_ratio = 16/9;
			}else if(value == '4/3'){
				_monitor_ratio = 4/3;
			}else if(value == '1/1'){
				_monitor_ratio = 1;
			}
			
			_monitorThumbSlideWidth = Math.round(_monitorThumbSlideHeight*_monitor_ratio);
			
			updateMonitorSize();
		});
		
		//右上方slider视图清晰度选择
		$('#monitor_sel_scale').on('change',function(){
			_monitors[_monitorIndex].Monitor.scale = $(this).val();
			var streamMjpegSrc = window.zm.cgiBinUrl+'?width=100%25&height=auto&mode=jpeg&maxfps=30'
										+'&scale='+_monitors[_monitorIndex].Monitor.scale
										+'&monitor='+_monitors[_monitorIndex].Monitor.Id
										+'&token='+window.zm.access_token
										+'&connkey='+_monitors[_monitorIndex].Monitor.connkey
										+'&rand='+Math.random();
			$('#screen_mjpeg_bigsize_'+_monitorIndex).attr('src', streamMjpegSrc);
		});
		
		
		//右上slider视图方尺寸选择
		$('#monitor_sel_size').on('change',function(){
			var value = Number($(this).val());
			
			updateMonitorSize();
			attachBigsizeMonitor(_monitorIndex);
		});
		
		
		//设置滚动条
		$("#monitor_list_scroll_container").mCustomScrollbar({
			autoHideScrollbar:false,
			theme:"minimal-dark",
			scrollInertia: 200
		});
		
		doGetMonitorList(); //获取监视器列表


		/*
		***********************************************************************
									翻译
		***********************************************************************
		 */
		//注册页面翻译函数
		window.addTranslationEvent(function(){
			var monitor_ipt_search_placeholder=$("#monitor_ipt_search").attr("placeholder");
			$("#monitor_ipt_search").attr("placeholder",myUNAS._(monitor_ipt_search_placeholder));
			
			if(myUNAS.CurrentLanguage == 'English'){
				$('.wrapper-monitor').removeClass('en').addClass('en');
				$('#monitor_btn_advance').css("width","150px");
			}else{
				$('.wrapper-monitor').removeClass('en');
			}
		});

		//执行翻译
		window.unasTranslation(myUNAS.CurrentLanguage);
	}

	function destroy(){
		//console.log('destroy monitor');
		
		if(_startGetStatusTimer){
			clearTimeout(_startGetStatusTimer);
		}
		
		if(isPageView()){
			clearPageView();
		}else{
			clearSliderView();
		}
	}
	
	//新增监视器后，更新监视器列表
	function updateMonitorList(){
		$("#monitor_ipt_search").val('');
		$("#monitor_ipt_search").data('lastValue','');
		
		_currentView = 'page';
		_monitorIndex = -1;
		
		doGetMonitorList();
	}
	//编辑监视器后，更新对应的监视器
	function updateMonitorEdited(monitorObj){
		var monitorData = {'Monitor':monitorObj, 'Monitor_Status':{}};
		for(var i=0,len=_monitorsOriginal.length; i<len; ++i){
			if(_monitorsOriginal[i].Monitor.Id == monitorObj.Id){
				
				monitorData.Monitor.connkey = parseInt(Math.random()*1000000); 
				monitorData.Monitor.scale = _monitorsOriginal[i].Monitor.scale;
			    monitorData.Monitor.isRemovedFromScreen = false;
			    monitorData.Monitor.isStreamWaiting = false;
			    monitorData.Monitor.lastGetStatusStartTime = 0;
			    monitorData.Monitor.lastGetStatusTimer = null;
				
				_monitorsOriginal[i] = monitorData;
				break;
			}
		}
		_monitors[_monitorIndex] = monitorData;
		
		var streamMjpegSrc = window.zm.cgiBinUrl+'?width=100%25&height=auto&mode=jpeg&maxfps=30'
											+'&scale='+monitorData.Monitor.scale
											+'&monitor='+monitorData.Monitor.Id
											+'&token='+window.zm.access_token
											+'&connkey='+monitorData.Monitor.connkey
											+'&rand='+Math.random();
		$('#screen_mjpeg_normal_'+_monitorIndex).attr('src',streamMjpegSrc);
		
		//当监视器的功能选择无时，隐藏ajax转圈圈的gif和左上角图片
		if(monitorData.Monitor.Function=="None"){
			$('#screen_mjpeg_normal_'+_monitorIndex).css('display',"none");
			$('#loading-icon_'+_monitorIndex).css('display',"none");
		}
		else{
			$('#screen_mjpeg_normal_'+_monitorIndex).css('display',"");
			$('#loading-icon_'+_monitorIndex).css('display',"");
		}
		$('#monitor_name_'+_monitorIndex).text(monitorData.Monitor.Name);
	}
	
	
	
	//获取监视器列表
	function doGetMonitorList(){
		showWaiting();
		
		//本地调试
		if(_isLocalDebug){
			setTimeout(function(){
				_monitorsOriginal = generateTestMonitors(1);
				addUniqueConnkey(_monitorsOriginal);
				
				showListContainer();
				filterMonitors(false);
				hideWaiting();
						
				// showNoticeEmpty();
				// hideWaiting();
			},1000);
			return;
		}
		
					
		jQuery.ajax({
			url: "/zm/api/monitors.json?token="+window.zm.access_token,
			type: "GET",
			async: true,
			dataType: 'json',
			success: function (data) {	
				if(data && data.monitors && data.monitors.length>0){
					_monitorsOriginal = data.monitors;
					addUniqueConnkey(_monitorsOriginal);
					showListContainer();
					filterMonitors(false);
				}else{
					showNoticeEmpty();
					//console.log('monitor monitor_list failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('monitor monitor_list error textStatus:' + textStatus);
			},
			complete: function(){
				hideWaiting();
			}
		});
	}
	function getNextMonitorIndex(){
		return _monitorsOriginal.length+1;
	}

	//添加监视器（简单添加）
	function addSimpleMonitor(){
		var _data=JSON.stringify({
			"Name":$("[id='simple-newMonitor[Name]']").val(),
			"Protocol":$("[id='simple-newMonitor[Protocol]']").val(),
			"Method":$("[id='simple-newMonitor[Method]']").val(),
			"Type":$("[id='simple-newMonitor[Type]']").val(),
			"Host":$("[id='simple-newMonitor[User]']").val()+":"+$("[id='simple-newMonitor[Pass]']").val()+"@"+$("[id='simple-newMonitor[IP]']").val(),
			"Port":$("[id='simple-newMonitor[Port]']").val(),
			"Path":$("[id='simple-newMonitor[Path]']").val(),
			"Width":$("[id='simple-newMonitor[Width]']").val()||1280,
			"Height":$("[id='simple-newMonitor[Height]']").val()||960,
			"Colours":4
		});


		//$.extend(_monitorObj,_data);
		//console.log(_monitorObj);

		$.ajax({
			url: "/zm/api/monitors.json?token="+window.zm.access_token,
			type: "POST",
			dataType: "json",
			contentType: "application/json",
			async: true,
			data: _data,
			timeout: 30000,
			success: function(data){
				//console.log(data);
				promptShow(data.message,function(){
					hideAddMonitorSimple();
					updateMonitorList();
				});
				// $("#popup_notice_text").text(myUNAS._(data.message));
				// $("#popup_notice").fadeIn(200,function(){
				// 	setTimeout(function(){
				// 		$("#popup_notice").fadeOut(200,function(){
				// 			//监视器添加成功后刷新页面，调用左侧预览的点击事件即可
				// 			$(".pngList")[0].click();
				// 		});
				// 	},2000)
				// })
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log(xhr);
				promptShow(xhr.responseJSON.data.message);
				// $("#popup_notice_text").text(myUNAS._(xhr.responseJSON.data.message));
				// $("#popup_notice").fadeIn(200,function(){
				//     setTimeout(function(){
				// 		$("#popup_notice").fadeOut(200);
				// 	},2000)
				// })
			}
		});
	}
	

	//以下函数的请求结果做一个保存
	var lanMonitorArr=[];
	//局域网搜索-操作-输入账号密码-点击下一步执行该函数
	function doLanMonitorInputUserPass(){
		var _data={
			probe:$("#moniter-prob-add-probe").val(),
			Username:$("#moniter-prob-add-username").val(),
			Password:$("#moniter-prob-add-password").val()
		}
		$.ajax({
			url: "/zm/api/monitors/probe2.json?token="+window.zm.access_token,
			type: "GET",
			dataType: "json",
			contentType: "application/json",
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
				//console.log(obj);
				lanMonitorArr=[];
				if(data.length==0){
					promptShow("获取摄像头可用的流媒体失败",function(){
						//$('#popup_monitor_prob_add_mointor').hide();
						//$("#popup_monitor_prob").hide();
					});
					return;
				}
				$("#monitor-prob-add-button-next").addClass("hide");
				$("#monitor-prob-add-button-pre").removeClass("hide");
				$("#monitor-prob-add-button-save").removeClass("hide");
				$("#monitor_lan_add_probe2_-2").addClass("hide");
				$("#monitor_lan_add_probe2_-1").addClass("hide");
				$("#monitor_lan_add_probe2_0").addClass("hide");
				$("#monitor_lan_add_probe2_1").removeClass("hide");
				$("#monitor_lan_add_probe2_2").removeClass("hide");

				var maxNameLength=0;
				for(var item of Object.keys(data)){
					lanMonitorArr.push(data[item]);

					//获取Name的最长值
					if(maxNameLength<data[item].Name.length){
						maxNameLength=data[item].Name.length;
					}
				}
				console.log(maxNameLength);
				var selectOptions="";

				for(var i=0;i<lanMonitorArr.length;i++){
					var temp="<tt>";
					if(lanMonitorArr[i].Name){
						temp+="["+complement("after",lanMonitorArr[i].Name,maxNameLength,"&nbsp;&nbsp;")+"]";
					}
					if(lanMonitorArr[i].Encoding){
						temp+="："+lanMonitorArr[i].Encoding+"&nbsp;&nbsp;";
					}
					if(lanMonitorArr[i].Width && lanMonitorArr[i].Height){
						temp+="("+complement("pre",lanMonitorArr[i].Width,4,"&nbsp;&nbsp;")+"x"+complement("pre",lanMonitorArr[i].Height,4,"&nbsp;&nbsp;")+")&nbsp;&nbsp;";
					}
					if(lanMonitorArr[i].MaxFPS){
						temp+="@"+lanMonitorArr[i].MaxFPS+" fps</tt>";
					}
					temp+="</tt>";
					selectOptions+="<option value='"+i+"'>"+temp+"</option>"
				}
				$("#moniter-prob-add-detected-profiles").empty();
				$("#moniter-prob-add-detected-profiles").append(selectOptions);


			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log(xhr);
				//console.log(ajaxOptions);
				//console.log(thrownError);
				//promptShow(xhr.responseJSON.data.message);
			}
		});
	}
	
	//当前是否处于表格页视图
	function isPageView(){
		return _currentView == 'page';
	}
	function updateMonitorSize(){
		getMonitorSize();
		if(isPageView()){
			$('.monitor-thumb-page').css({'width':_monitorThumbWidth, 'height':_monitorThumbHeight});
			
			//删除所有空白thumb
			$('.monitor-thumb-empty').remove();
			//用空白thumb补全每行显示的监视器
			attachThumbEmpty();
		}else{
			$('.monitor-thumb-slide').css({'width':_monitorThumbSlideWidth, 'height':_monitorThumbSlideHeight});
			$('.monitor-slider-view .swiper-slide').css({'width':_monitorThumbSlideWidth, 'height':_monitorThumbSlideHeight});
		
			$('.monitor-thumb-bigsize').css({'width':_monitorThumbBigsizeWidth, 'height':_monitorThumbBigsizeHeight});
		}
	}
	function getMonitorSize(){
		if(isPageView()){
			var _width = $('#monitor_page_view').width();
			_monitorThumbWidth = Math.round((_width-5-(MARGIN_RIGHT_WIDTH*_num_per_line))/_num_per_line);
			_monitorThumbHeight = Math.round(_monitorThumbWidth/_monitor_ratio);
		}else{
			var value = Number($('#monitor_sel_size').val());
			if(value == 0){
				var _widthBigsize = $('#monitor_thumb_bigsize_view').width();
				var _heightBigsize = $('#monitor_thumb_bigsize_view').height();
				if(_widthBigsize/_heightBigsize >= _monitor_ratio){
					_monitorThumbBigsizeHeight = _heightBigsize;
					_monitorThumbBigsizeWidth = _heightBigsize*_monitor_ratio;
				}else{
					_monitorThumbBigsizeWidth = _widthBigsize;
					_monitorThumbBigsizeHeight = _widthBigsize/_monitor_ratio;
				}
			}else{
				var monitorData = _monitors[_monitorIndex];
				if(monitorData){
					_monitorThumbBigsizeWidth = parseInt(monitorData.Monitor.Width) * value/100;
					_monitorThumbBigsizeHeight = parseInt(monitorData.Monitor.Height) * value/100;
				}else{
					var _widthBigsize = $('#monitor_thumb_bigsize_view').width();
					var _heightBigsize = $('#monitor_thumb_bigsize_view').height();
					if(_widthBigsize/_heightBigsize >= _monitor_ratio){
						_monitorThumbBigsizeHeight = _heightBigsize;
						_monitorThumbBigsizeWidth = _heightBigsize*_monitor_ratio;
					}else{
						_monitorThumbBigsizeWidth = _widthBigsize;
						_monitorThumbBigsizeHeight = _widthBigsize/_monitor_ratio;
					}
				}
			}
		}
	}
	
	function filterMonitors(checkLastValue){
		var value = getTrimValue('#monitor_ipt_search');
		if(checkLastValue && $("#monitor_ipt_search").data('lastValue') === value){
			return;
		}
		
		//停止所有监视器的状态轮询请求
		stopGetStatus();
		
		if(value){
			var arr = [];
			for(var i=0,len=_monitorsOriginal.length; i<len; ++i){
				if(_monitorsOriginal[i].Monitor.Name.indexOf(value) != -1){
					arr.push(_monitorsOriginal[i]);
				}
			}
			_monitors = arr; //用于显示的列表数据
		}else{
			_monitors = _monitorsOriginal; //用于显示的列表数据
		}
		
		$("#monitor_ipt_search").data('lastValue',value);
		
		
		//根据当前所处的视图，填充对应的监视器列表
		if(isPageView()){
			attachMonitors(_monitors);
		}else{
			attachSlideMonitors(_monitors);
		}
	}
	
	
	function showListContainer(){
		$('#monitor_page_view').show();
		$('#monitor_slider_view').hide();
		$('#monitor_notice_empty').hide();
		$('#wrapper_monitor').show();
	}
	
	function showNoticeEmpty(){
		$('#monitor_page_view').hide();
		$('#monitor_slider_view').hide();
		$('#monitor_notice_empty').show();
		$('#wrapper_monitor').fadeIn(400);
		
		//点击'添加'文本
		$('.monitor-notice-text .strong').click(function(){
			showAddMonitorSimple();
		});
	}
	
	
	
	//===================================================================================
	//监视器表格页视图 
	//===================================================================================
	//显示监视器表格页视图 
	function showMonitorPageView(){
		clearSliderView();
		
		$('#monitor_page_view').show();
		$('#monitor_slider_view').hide();
		$('#monitor_notice_empty').hide();
		
		$('.monitor-view-model-container').show();
		$('.monitor-stream-setting-container').hide();
		
		_currentView = 'page';
		
		filterMonitors(false);
	}
	
	function clearPageView(){
		//停止所有监视器的状态轮询请求
		stopGetStatus();
		
		removeEvents();
		$('#monitor_list').empty();
	}
	
	function attachMonitors(monitors){
		getMonitorSize();
		
		var $monitorList = $('#monitor_list');
		
		removeEvents();
		$monitorList.empty();
		
		var str = '';
		var strEdit = myUNAS._('编辑');
		var strBigsize = myUNAS._('放大');
		var strRemove = myUNAS._('删除');
		var strStatus = myUNAS._('状态：');

		for(var i=0,len=monitors.length; i<len; ++i){
			//不显示已经删除的monitor
			if(monitors[i].Monitor.isRemovedFromScreen) continue;
			
			str += '<div class="monitor-thumb monitor-thumb-page monitor-thumb-stuffed" id="monitor_thumb_page_'+i+'" style="width:'+_monitorThumbWidth+'px; height:'+_monitorThumbHeight+'px">';
				str += '<div class="placeholder-container hide" data-ref="'+i+'">';
					str += '<div class="rect"></div>';
					str += '<div class="rect rect-vert"></div>';
				str += '</div>';
						
				str += '<div class="monitor-container">';
				if(monitors[i].Monitor.Function=="None"){
					str += '<img class="loading-icon" id="loading-icon_'+i+'" src="./images/ajax-loader.gif" style="display:none">';
				}
				else{
					str += '<img class="loading-icon" id="loading-icon_'+i+'" src="./images/ajax-loader.gif">';
				}
					str += '<div class="screen-container flex-center">';
						// /zm/cgi-bin/nph-zms?width=100%25&height=auto&mode=jpeg&maxfps=30&monitor=1&token=dd4c003b31a766ed544c077620f2d0c2&connkey=923920&rand=1626659658
						var streamMjpegSrc = window.zm.cgiBinUrl+'?width=100%25&height=auto&mode=jpeg&maxfps=30'
											+'&scale='+monitors[i].Monitor.scale
											+'&monitor='+monitors[i].Monitor.Id
											+'&token='+window.zm.access_token
											+'&connkey='+monitors[i].Monitor.connkey
											+'&rand='+Math.random();
						if(monitors[i].Monitor.Function=="None"){
							str += '<img class="screen-mjpeg" id="screen_mjpeg_normal_'+i+'" data-ref="'+i+'" src="'+streamMjpegSrc+'" style="display:none" />';
						}
						else{
							str += '<img class="screen-mjpeg" id="screen_mjpeg_normal_'+i+'" data-ref="'+i+'" src="'+streamMjpegSrc+'" />';
						}

					str += '</div>';
					
					str += '<div class="name-container hide" id="monitor_name_'+i+'">'+monitors[i].Monitor.Name+'</div>';
					
					str += '<div class="control-container hide">';
						str += '<div class="icon-control-list"></div>';
						str += '<div class="control-list hide">';
							str += '<div class="control-item control-item-edit" data-ref="'+i+'" id="control_item_edit_'+i+'">'+strEdit+'</div>';
							str += '<div class="control-item control-item-bigsize" data-ref="'+i+'" id="control_item_bigsize_'+i+'">'+strBigsize+'</div>';
							str += '<div class="control-item control-item-remove" data-ref="'+i+'" id="control_item_remove_'+i+'">'+strRemove+'</div>';
						str += '</div>';
					str += '</div>';
					
					str += '<div class="control-panel-container hide">';
						str += '<div class="control-panel">';
							str += '<button class="zm-btn-media zm-btn-media-pause inactive" id="zm_btn_media_pause_'+i+'" data-ref="'+i+'"></button>';
							str += '<button class="zm-btn-media zm-btn-media-play inactive" id="zm_btn_media_play_'+i+'" data-ref="'+i+'"></button>';
							str += '<button class="zm-btn-media zm-btn-media-zoomout inactive" id="zm_btn_media_zoomout_'+i+'" data-ref="'+i+'"></button>';
						str += '</div>';
						str += '<div class="control-panel-status" id="cp_status_'+i+'">'+strStatus+'</div>';
					str += '</div>';
				str += '</div>';
			str += '</div>';
		}
		
		$monitorList.append(str);
		addEvents('.monitor-thumb-stuffed');
		
		//用空白thumb补全每行显示的监视器
		attachThumbEmpty();
		
		//开始所有监视器的状态轮询请求
		startGetStatus();
	}
	
	//用空白thumb补全每行显示的监视器
	function attachThumbEmpty(){
		var str = '';
	    var strEdit = myUNAS._('编辑');
	    var strBigsize = myUNAS._('放大');
	    var strRemove = myUNAS._('删除');
	    var strStatus = myUNAS._('状态：');
	    
	    var index = _monitors.length;
	    str += '<div class="monitor-thumb monitor-thumb-page monitor-thumb-empty" id="monitor_thumb_page_'+index+'" style="width:'+_monitorThumbWidth+'px; height:'+_monitorThumbHeight+'px">';
	      str += '<div class="placeholder-container" data-ref="'+index+'">';
	        str += '<div class="rect"></div>';
	        str += '<div class="rect rect-vert"></div>';
	      str += '</div>';
	          
	      str += '<div class="monitor-container hide">';
	        str += '<img class="loading-icon" src="./images/ajax-loader.gif">';
	        str += '<div class="screen-container flex-center">';
	          str += '<img class="screen-mjpeg" data-ref="'+index+'" />';
	        str += '</div>';
	        str += '<div class="control-container hide">';
	          str += '<div class="icon-control-list"></div>';
	          str += '<div class="control-list hide">';
	            str += '<div class="control-item control-item-edit" data-ref="'+index+'" id="control_item_edit_'+index+'">'+strEdit+'</div>';
	            str += '<div class="control-item control-item-bigsize" data-ref="'+index+'" id="control_item_bigsize_'+index+'">'+strBigsize+'</div>';
	            str += '<div class="control-item control-item-remove" data-ref="'+index+'" id="control_item_remove_'+index+'">'+strRemove+'</div>';
	          str += '</div>';
	        str += '</div>';
	        str += '<div class="control-panel-container hide">';
	          str += '<div class="control-panel">';
	            str += '<button class="zm-btn-media zm-btn-media-pause inactive" id="zm_btn_media_pause_'+index+'" data-ref="'+index+'"></button>';
	            str += '<button class="zm-btn-media zm-btn-media-play inactive" id="zm_btn_media_play_'+index+'" data-ref="'+index+'"></button>';
	            str += '<button class="zm-btn-media zm-btn-media-zoomout inactive" id="zm_btn_media_zoomout_'+index+'" data-ref="'+index+'"></button>';
	          str += '</div>';
	          str += '<div class="control-panel-status" id="cp_status_'+index+'">'+strStatus+'</div>';
	        str += '</div>';
	      str += '</div>';
	    str += '</div>';
	    
	    $('#monitor_list').append(str);
	    addEvents('.monitor-thumb-empty');
	}
	//===================================================================================
	
	
	
	function addEvents(cssSelecter){
		$(cssSelecter).mouseenter(function(){
			$(this).find('.name-container').show();
			$(this).find('.control-container').show();
			$(this).find('.control-panel-container').show();
		});
		$(cssSelecter).mouseleave(function(){
			$(this).find('.name-container').hide();
			$(this).find('.control-container').hide();
			$(this).find('.control-list').hide();
			$(this).find('.control-panel-container').hide();
		});
		
		//空thumb
		$(cssSelecter+' .placeholder-container').click(function(){
			showAddMonitorSimple();
		});
		
		
		
		//右上方'...'
		$(cssSelecter+' .icon-control-list').click(function(){
			$(this).siblings('.control-list').toggle();
		});
		//右上方下拉菜单'编辑'
		$(cssSelecter+' .control-item-edit').click(function(){
			var index = $(this).data('ref');
			//console.log('edit index:'+index);
			
			_monitorIndex = index;
			var comprehensiveData = _monitors[_monitorIndex];
			showEditMonitorComprehensive(comprehensiveData);
		});
		//右上方下拉菜单'放大'
		$(cssSelecter+' .control-item-bigsize').click(function(){
			var index = $(this).data('ref');
			//console.log('bigsize index:'+index);
			
			_monitorIndex = index;
			showMonitorSliderView();
		});
		//右上方下拉菜单'返回'
		$(cssSelecter+' .control-item-back').click(function(){
			var index = $(this).data('ref');
			//console.log('back index:'+index);
			
			_monitorIndex = -1;
			showMonitorPageView();
		});
		//右上方下拉菜单'删除'
		$(cssSelecter+' .control-item-remove').click(function(){
			var index = $(this).data('ref');
			//console.log('remove index:'+index);

			//发起删除监视器请求
			//console.log(_monitors[index].Monitor.Id);
			showConfirmDelete(function(){
				var monitorId=_monitors[index].Monitor.Id;
				deleteMointor(monitorId,function(){
					if(_monitors[index].Monitor.lastGetStatusTimer){
						clearTimeout(_monitors[index].Monitor.lastGetStatusTimer);
						_monitors[index].Monitor.lastGetStatusTimer = null;
					}
					_monitors[index].Monitor.isRemovedFromScreen = true;
					
					
					if(isPageView()){
						$('#monitor_thumb_page_'+index).remove();
					
						//删除所有空白thumb
						$('.monitor-thumb-empty').remove();
						
						//用空白thumb补全每行显示的监视器
						attachThumbEmpty();
					}else{
						showMonitorPageView();
					}
				});
			});
			
		});
		
		
		
		//zoomin'流静帧'（点击'流静帧'，在点击处zoomin）
		$(cssSelecter+' .screen-mjpeg').click(function(e){
			var index = $(this).data('ref');
			//console.log('zoomin mjpeg index:'+index);
			//console.log('e.offsetX:'+e.offsetX+' e.offsetY:'+e.offsetY);
			doZoominStreamMjpeg(index, e.offsetX, e.offsetY);
		});
		//zoomout'流静帧'
		$(cssSelecter+' .zm-btn-media-zoomout').click(function(e){
			var $that = $(this);
			if($that.hasClass('active') || $that.hasClass('inactive')) return;
			
			var index = $that.data('ref');
			//console.log('zoomout mjpeg index:'+index);
			doZoomoutStreamMjpeg(index);
		});
		
		//pause'流静帧'
		$(cssSelecter+' .zm-btn-media-pause').click(function(e){
			var $that = $(this);
			if($that.hasClass('active') || $that.hasClass('inactive')) return;
			
			var index = $that.data('ref');
			//console.log('pause mjpeg index:'+index);
			doPauseStreamMjpeg(index);
		});
		
		//play'流静帧'
		$(cssSelecter+' .zm-btn-media-play').click(function(e){
			var $that = $(this);
			if($that.hasClass('active') || $that.hasClass('inactive')) return;
			
			var index = $that.data('ref');
			//console.log('play mjpeg index:'+index);
			doPlayStreamMjpeg(index);
		});
	}
	function removeEvents(){
		$('.zm-btn-media-pause').off();
		$('.zm-btn-media-play').off();
		$('.zm-btn-media-zoomout').off();
		$('.screen-mjpeg').off();
		
		$('.icon-control-list').off();
		$('.control-item-edit').off();
		$('.control-item-bigsize').off();
		$('.control-item-back').off();
		$('.control-item-remove').off();
		
		$('.monitor-thumb').off();
		$('.placeholder-container').off();
	}
	
	// play'流静帧'（command=2）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=2
	function doPlayStreamMjpeg(dataIndex){
		var monitorData = _monitors[dataIndex];
		if(monitorData.Monitor.isStreamWaiting) return;
		
		//console.log('command-2 connkey:'+monitorData.Monitor.connkey);
		
		monitorData.Monitor.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+monitorData.Monitor.connkey+
											'&token='+window.zm.access_token+
											'&command=2';
		jQuery.ajax({
			url: reqUrl,
			type: "GET",
			async: true,
			dataType: 'json',
			success: function (data) {
				if(data.result && data.result.toLowerCase() == 'ok'){
					if(data.status){
						updateMonitorStatus(dataIndex, data.status);
					}
				}else{
					//console.log('monitor stream_mjpeg play failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('monitor stream_mjpeg play error textStatus:' + textStatus);
			},
			complete: function(){
				monitorData.Monitor.isStreamWaiting = false;
			}
		});
	}
	
	// pause'流静帧'（command=1）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=1
	function doPauseStreamMjpeg(dataIndex){
		var monitorData = _monitors[dataIndex];
		if(monitorData.Monitor.isStreamWaiting) return;
		
		//console.log('command-1 connkey:'+monitorData.Monitor.connkey);
		
		monitorData.Monitor.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+monitorData.Monitor.connkey+
											'&token='+window.zm.access_token+
											'&command=1';
		jQuery.ajax({
			url: reqUrl,
			type: "GET",
			async: true,
			dataType: 'json',
			success: function (data) {
				if(data.result && data.result.toLowerCase() == 'ok'){
					if(data.status){
						updateMonitorStatus(dataIndex, data.status);
					}
				}else{
					//console.log('monitor stream_mjpeg pause failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('monitor stream_mjpeg pause error textStatus:' + textStatus);
			},
			complete: function(){
				monitorData.Monitor.isStreamWaiting = false;
			}
		});
	}
	
	
	// zoomout'流静帧'（command=9）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117&command=9
	function doZoomoutStreamMjpeg(dataIndex){
		var monitorData = _monitors[dataIndex];
		if(monitorData.Monitor.isStreamWaiting) return;
		
		monitorData.Monitor.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+monitorData.Monitor.connkey+
											'&token='+window.zm.access_token+
											'&command=9';
		jQuery.ajax({
			url: reqUrl,
			type: "GET",
			async: true,
			dataType: 'json',
			success: function (data) {
				if(data.result && data.result.toLowerCase() == 'ok'){
					if(data.status){
						updateMonitorStatus(dataIndex, data.status);
					}
				}else{
					//console.log('monitor stream_mjpeg zoomout failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('monitor stream_mjpeg zoomout error textStatus:' + textStatus);
			},
			complete: function(){
				monitorData.Monitor.isStreamWaiting = false;
			}
		});
	}
	
	
	// zoomin'流静帧'（command=8）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=8&x=182&y=149
	function doZoominStreamMjpeg(dataIndex, offsetX, offsetY){
		var monitorData = _monitors[dataIndex];
		if(monitorData.Monitor.isStreamWaiting) return;
		
		monitorData.Monitor.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+monitorData.Monitor.connkey+
											'&token='+window.zm.access_token+
											'&command=8&x='+offsetX+'&y='+offsetY;
		jQuery.ajax({
			url: reqUrl,
			type: "GET",
			async: true,
			dataType: 'json',
			success: function (data) {
				if(data.result && data.result.toLowerCase() == 'ok'){
					if(data.status){
						updateMonitorStatus(dataIndex, data.status);
					}
				}else{
					//console.log('monitor stream_mjpeg zoomin failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('monitor stream_mjpeg zoomin error textStatus:' + textStatus);
			},
			complete: function(){
				monitorData.Monitor.isStreamWaiting = false;
			}
		});
	}
	
	
	//停止所有监视器的状态轮询请求
	function stopGetStatus(){
		_forceStopStatusTimer = true;
		
		for(var i=0,len=_monitors.length; i<len; ++i){
			clearTimeout(_monitors[i].Monitor.lastGetStatusTimer);
			_monitors[i].Monitor.lastGetStatusTimer = null;
		}
	}
	//开始所有监视器的状态轮询请求
	function startGetStatus(){
		_startGetStatusTimer = setTimeout(function(){
			_forceStopStatusTimer = false;
			
			for(var i=0,len=_monitors.length; i<len; ++i){
				doGetStatusMjpeg(i);
			}
		},REFRESH_INTERVAL);
	}
	// get_status'流静帧'（command=99）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=99
	function doGetStatusMjpeg(dataIndex){
		var monitorData = _monitors[dataIndex];
		if(monitorData.Monitor.isRemovedFromScreen) return; //已被删除的monitor，不再继续更新状态显示
		
		//console.log('command-99 connkey:'+monitorData.Monitor.connkey);
		
		//记录请求发起事件
		monitorData.Monitor.lastGetStatusStartTime = new Date().getTime();
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+monitorData.Monitor.connkey+
											'&token='+window.zm.access_token+
											'&command=99';
		jQuery.ajax({
			url: reqUrl,
			type: "GET",
			async: true,
			timeout: 10000,
			dataType: 'json',
			success: function (data) {
				if(data.result && data.result.toLowerCase() == 'ok'){
					if(data.status){
						updateMonitorStatus(dataIndex, data.status);
					}
				}else{
					//console.log('monitor stream_mjpeg get_status failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('monitor stream_mjpeg get_status error textStatus:' + textStatus);
			},
			complete: function(){
				var endTime = new Date().getTime();
				var timeout = endTime - monitorData.Monitor.lastGetStatusStartTime;
				if(timeout > REFRESH_INTERVAL){
					if(!_forceStopStatusTimer){
						doGetStatusMjpeg(dataIndex);
					}
				}else{
					monitorData.Monitor.lastGetStatusTimer = setTimeout(function(){
						if(!_forceStopStatusTimer){
							doGetStatusMjpeg(dataIndex);
						}
					},REFRESH_INTERVAL-timeout);
				}
			}
		});
	}
	
	//{"type":2,"monitor":1,"state":0,"fps":26.71,"level":0,"rate":1,"delay":1414.09,"zoom":1.5,"delayed":0,"paused":1,"enabled":1,"forced":0}
	function updateMonitorStatus(dataIndex,statusData){
		var str = '';
		str += myUNAS._('状态：')+getStateStr(statusData.state)+'　|　';
		str += statusData.fps+'fps'+'　|　';
		str += myUNAS._('模式：')+getModeStr(statusData.paused)+'　|　';
		if(statusData.paused){
			//延迟秒数只在暂停后显示
			str += myUNAS._('延迟：')+getLastTimeStr(statusData.delay)+'　|　';
		}
		str += myUNAS._('缩放：')+statusData.zoom+'X';
		
		
		
		var key;
		if(isPageView()){
			key = '';
		}else{
			key = '_bigsize';
		}
		
		$('#cp_status'+key+'_'+dataIndex).html(str);
			
		//重置所有底部流操作按钮状态
		$('#zm_btn_media_pause'+key+'_'+dataIndex).removeClass('active, inactive');
		$('#zm_btn_media_play'+key+'_'+dataIndex).removeClass('active, inactive');
		$('#zm_btn_media_zoomout'+key+'_'+dataIndex).removeClass('active, inactive');
		
		//如果没有缩放
		if(Number(statusData.zoom) == 1){
			$('#zm_btn_media_zoomout'+key+'_'+dataIndex).addClass('inactive');
		}
		//如果处于暂停状态
		if(statusData.paused){
			$('#zm_btn_media_pause'+key+'_'+dataIndex).addClass('inactive');
		}else{
			$('#zm_btn_media_play'+key+'_'+dataIndex).addClass('inactive');
		}
	}
	
	//delay：延迟秒数（只在暂停后显示）
	function getLastTimeStr(delay){
		var HOUR_SECOND = 60*60;
		var MINUTE_SECOND = 60;
		
		var hour = parseInt(delay/HOUR_SECOND);
		var minute = parseInt((delay%HOUR_SECOND)/MINUTE_SECOND);
		var second = ((delay%HOUR_SECOND)%MINUTE_SECOND);
		return hour+':'+minute+':'+second;
	}
	function getModeStr(paused){
		var intPaused = parseInt(paused);
		var str = '';
		switch(intPaused){
			case 1:
				str = myUNAS._('暂停');
				break;
			case 0:
				str = myUNAS._('实时');
				break;
		}
		return str;
	}
	function getStateStr(state){
		var intState = parseInt(state);
		var str = '';
		switch(intState){
			case 0:
				str = myUNAS._('空闲');
				break;
			case 4:
				str = myUNAS._('录制');
				break;
		}
		return str;
	}
	
	
	
	
	
	
	//===================================================================================
	//监视器slider视图 （底部slider，上部放大当前选中的监视器）
	//===================================================================================
	//显示监视器slider视图 
	function showMonitorSliderView(){
		clearPageView();
		
		$('#monitor_slider_view').show();
		$('#monitor_page_view').hide();
		$('#monitor_notice_empty').hide();
		
		$('.monitor-view-model-container').hide();
		$('.monitor-stream-setting-container').show();
		
		_currentView = 'slider';
		
		filterMonitors(false);
		
		_monitorSlider = new Swiper ('.swiper-container', {
		    navigation: {
			    nextEl: '.swiper-button-next',
			    prevEl: '.swiper-button-prev',
			},
		    slidesPerView: 'auto',
		    spaceBetween: 20
		});
		
		
		//因为用户操作，可能会删除_monitor列表中的监视器，所以slider的index和_monitor的index并不总是一一对应的
		var sliderIndex = _monitorIndex;
		for(var i=0,lastIndex=_monitorIndex; i<lastIndex; ++i){
			if(_monitors[i].Monitor.isRemovedFromScreen){
				sliderIndex -= 1;
			}
		}
		//console.log('sliderIndex:'+sliderIndex);
		_monitorSlider.slideTo(sliderIndex, 0, false); //直接跳转到指定索引
	}
	
	function clearSliderView(){
		//停止所有监视器的状态轮询请求
		stopGetStatus();
		
		removeEvents();
		$('#monitor_thumb_bigsize_container').empty();
		
		if(_monitorSlider){
			_monitorSlider.destroy();
			_monitorSlider = null;
		}
	}
		
	
	function attachBigsizeMonitor(i){
		var $bigsizeContainer = $('#monitor_thumb_bigsize_container');
		
		removeEvents();
		$bigsizeContainer.empty();
		
		var str = '';
		var strEdit = myUNAS._('编辑');
		var strBack = myUNAS._('返回');
		var strRemove = myUNAS._('删除');
		var strStatus = myUNAS._('状态：');
		str += '<div class="monitor-thumb monitor-thumb-bigsize" style="width:'+_monitorThumbBigsizeWidth+'px; height:'+_monitorThumbBigsizeHeight+'px">';
			str += '<div class="monitor-container">';
				str += '<img class="loading-icon" src="./images/ajax-loader.gif">';
				str += '<div class="screen-container flex-center">';
					// /zm/cgi-bin/nph-zms?width=100%25&height=auto&mode=jpeg&maxfps=30&monitor=1&token=dd4c003b31a766ed544c077620f2d0c2&connkey=923920&rand=1626659658
					var streamMjpegSrc = window.zm.cgiBinUrl+'?width=100%25&height=auto&mode=jpeg&maxfps=30'
										+'&scale='+_monitors[i].Monitor.scale
										+'&monitor='+_monitors[i].Monitor.Id
										+'&token='+window.zm.access_token
										+'&connkey='+_monitors[i].Monitor.connkey
										+'&rand='+Math.random();
					str += '<img class="screen-mjpeg" id="screen_mjpeg_bigsize_'+i+'" data-ref="'+i+'" src="'+streamMjpegSrc+'" />';
				str += '</div>';
				
				str += '<div class="name-container hide">'+_monitors[i].Monitor.Name+'</div>';
				
				str += '<div class="control-container hide">';
					str += '<div class="icon-control-list"></div>';
					str += '<div class="control-list hide">';
						str += '<div class="control-item control-item-edit" data-ref="'+i+'" id="control_item_edit_bigsize_'+i+'">'+strEdit+'</div>';
						str += '<div class="control-item control-item-back" data-ref="'+i+'" id="control_item_back_bigsize_'+i+'">'+strBack+'</div>';
						str += '<div class="control-item control-item-remove" data-ref="'+i+'" id="control_item_remove_bigsize_'+i+'">'+strRemove+'</div>';
					str += '</div>';
				str += '</div>';
				
				str += '<div class="control-panel-container hide">';
					str += '<div class="control-panel">';
						str += '<button class="zm-btn-media zm-btn-media-pause inactive" id="zm_btn_media_pause_bigsize_'+i+'" data-ref="'+i+'"></button>';
						str += '<button class="zm-btn-media zm-btn-media-play inactive" id="zm_btn_media_play_bigsize_'+i+'" data-ref="'+i+'"></button>';
						str += '<button class="zm-btn-media zm-btn-media-zoomout inactive" id="zm_btn_media_zoomout_bigsize_'+i+'" data-ref="'+i+'"></button>';
					str += '</div>';
					str += '<div class="control-panel-status" id="cp_status_bigsize_'+i+'">'+strStatus+'</div>';
				str += '</div>';
			str += '</div>';
		str += '</div>';
		
		$bigsizeContainer.append(str);
		addEvents('.monitor-thumb-bigsize');
		
		//开始所有监视器的状态轮询请求
		startGetStatus();
		
		
		var value = Number($('#monitor_sel_size').val());
		if(value == 0){
			$('#monitor_thumb_bigsize_container').css('overflow','hidden');
			$('.monitor-thumb-bigsize').removeClass('rel');
		}else{
			$('#monitor_thumb_bigsize_container').css('overflow','scroll');
			$('.monitor-thumb-bigsize').addClass('rel');
		}
	}
	
	function attachSlideMonitors(monitors){
		getMonitorSize();
		
		var $swiperWrapper = $('#swiper_wrapper_monitor');
		
		removeSlideEvents();
		$swiperWrapper.empty();
		
		var str = '';
		for(var i=0,len=_monitors.length; i<len; ++i){
			//不显示已经删除的monitor
			if(_monitors[i].Monitor.isRemovedFromScreen) continue;
			
			str += '<div class="swiper-slide monitor-swiper-slide" data-ref="'+i+'" style="margin-left:0px; width:'+_monitorThumbSlideWidth+'px; height:'+_monitorThumbSlideHeight+'px">';
				str += '<div class="monitor-thumb monitor-thumb-slide" id="monitor_thumb_slide_'+i+'" style="width:'+_monitorThumbSlideWidth+'px; height:'+_monitorThumbSlideHeight+'px">';
					str += '<div class="monitor-container">';
						str += '<img class="loading-icon" src="./images/ajax-loader.gif">'; 
						str += '<div class="screen-container flex-center">';
							var streamMjpegSrc = window.zm.cgiBinUrl+'?width=100%25&height=auto&mode=jpeg&maxfps=30'
												+'&scale='+_monitors[i].Monitor.scale
												+'&monitor='+_monitors[i].Monitor.Id
												+'&token='+window.zm.access_token
												+'&connkey='+parseInt(Math.random()*1000000)
												+'&rand='+Math.random();
							str += '<img class="screen-mjpeg" src="'+streamMjpegSrc+'" />';
							//str += '<img class="screen-mjpeg" src="./images/1920x1080.jpg" />';
						str += '</div>';
						
						str += '<div class="name-container">'+_monitors[i].Monitor.Name+'</div>';
					str += '</div>';
				str += '</div>';
			str += '</div>';
		}
		
		$swiperWrapper.append(str);
		
		addSlideEvents();
		
		//为当前选中的thumb添加active样式
		$('#monitor_thumb_slide_'+_monitorIndex).addClass('active');
		attachBigsizeMonitor(_monitorIndex);
	}
	function addSlideEvents(){
		$('.monitor-swiper-slide').on('click',function(){
			var $that = $(this);
			if($that.hasClass('active')) return;
			
			var index = $that.data('ref');
			_monitorIndex = index;
			$('.monitor-thumb-slide').removeClass('active');
			$('#monitor_thumb_slide_'+index).addClass('active');
			attachBigsizeMonitor(_monitorIndex);
		});
	}
	function removeSlideEvents(){
		$('.monitor-thumb-slide').off();
	}
	//===================================================================================
	
	
	
	//===================================================================================
	//'局域网搜索'弹窗
	//===================================================================================
	//显示'局域网搜索'弹窗
	function showMonitorProb(){
		$('#popup_monitor_prob').show();
		
		doGetMonitorLanList();
	}
	function hideMonitorProb(){
		$('#popup_monitor_prob').hide();
	}
	
	//获取局域网内可用监视器列表
	function doGetMonitorLanList(){
		$('#loading_monitor_prob').show();
		
		//本地调试
		if(_isLocalDebug){
			setTimeout(function(){
				_monitorsLan = generateTestMonitorsLan(10);
				$('#monitor_prob_list_view').show();
				$('#monitor_prob_notice_empty').hide();
				attachMonitorsLan(_monitorsLan);
						
				//$('#monitor_prob_list_view').hide();
				//$('#monitor_prob_notice_empty').show();
				
				$('#loading_monitor_prob').hide();
			},1000);
			return;
		}
					
		jQuery.ajax({
			url: "/zm/api/monitors/probe.json?token="+window.zm.access_token,
			type: "GET",
			async: true,
			dataType: 'json',
			contentType: "application/json;charset=utf-8",
			data: {},
			success: function (data) {
				//console.log(data);
				

				$('#monitor_prob_list_view').show();
				$('#monitor_prob_notice_empty').hide();
				attachMonitorsLan(data);

				// if(data && parseInt(data.err) === 0){
				// 	if(data.results.monitors && data.results.monitors>0){
				// 		_monitorsLan = data.results.monitors;
				// 		$('#monitor_prob_list_view').show();
				// 		$('#monitor_prob_notice_empty').hide();
				// 		attachMonitorsLan(_monitorsLan);
				// 	}else{
				// 		$('#monitor_prob_list_view').hide();
				// 		$('#monitor_prob_notice_empty').show();
				// 	}
				// }else{
				// 	//console.log('monitor monitor_lan_list failed');
				// }	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('monitor monitor_lan_list error textStatus:' + textStatus);
			},
			complete: function(){
				$('#loading_monitor_prob').hide();
			}
		});
	}
	function attachMonitorsLan(monitorsLan){
		var $monitorTable = $('#monitor_table');
		
		removeEventsLab();
		$monitorTable.empty();
		
		var str = '';

		for(item of Object.keys(monitorsLan)){
			let temp=monitorsLan[item];
			str += '<tr>';
				str += '<td class="td_monitor_name">'+temp.model+'</td>';
				str += '<td class="td_monitor_ip">'+temp.host+'</td>';
				str += '<td class="td_monitor_protocol">'+temp.protocol+'</td>';
				str += '<td class="td_monitor_version">'+temp.version+'</td>';
				str += '<td class="td_monitor_operation">';
					str += '<div class="td_icon td_icon_add_monitor" data-ref="'+i+'" data-key="'+item+'" data-name="'+temp.model+'" data-host="'+temp.host+'" data-protocol="'+temp.protocol+'"></div>';
				str += '</td>';
			str += '</tr>';
		}
		// for(var i=0,len=monitorsLan.length; i<len; ++i){
		// 	str += '<tr>';
		// 		str += '<td class="td_monitor_name">'+monitorsLan[i].Name+'</td>';
		// 		str += '<td class="td_monitor_ip">'+monitorsLan[i].Ip+'</td>';
		// 		str += '<td class="td_monitor_protocol">'+monitorsLan[i].Protocol+'</td>';
		// 		str += '<td class="td_monitor_operation">';
		// 			str += '<div class="td_icon td_icon_add_monitor" data-ref="'+i+'"></div>';
		// 		str += '</td>';
		// 	str += '</tr>';
		// }
		
		$monitorTable.append(str);
		addEventsLan();
	}
	function addEventsLan(){
		$('.td_icon_add_monitor').on('click',function(){
			var index = $(this).data('ref');
			//showAddMonitorSimpleFromProb(_monitorsLan[index]);
			
			//显示前清空上次的相关操作
			$("#moniter-prob-add-username").val("");
			$("#moniter-prob-add-password").val("");
			$("#moniter-prob-add-detected-profiles").empty();
			$("#monitor_lan_add_probe2_-2").removeClass("hide");
			$("#monitor_lan_add_probe2_-1").removeClass("hide");
			$("#monitor_lan_add_probe2_0").removeClass("hide");
			$("#monitor_lan_add_probe2_1").addClass("hide");
			$("#monitor_lan_add_probe2_2").addClass("hide");
			$("#monitor-prob-add-button-next").removeClass("hide");
			$("#monitor-prob-add-button-save").addClass("hide");
			$("#monitor-prob-add-button-pre").addClass("hide");
			$("#popup_monitor_prob_add_mointor").show();

			$("#moniter-prob-add-probe").val($(this).data('key'));
			$("#moniter-prob-add-name").val($(this).data('name'));
			$("#moniter-prob-add-host").val($(this).data('host'));
			$("#moniter-prob-add-protocol").val($(this).data('protocol'));
		});
	}
	function removeEventsLab(){
		$('.td_icon_add_monitor').off();
	}
	//===================================================================================
	
	
	
	//===================================================================================
	//'监视器配置项'弹窗
	//===================================================================================
	function showAddMonitorSimpleFromProb(monitorsLan){
		var simpleData = getDefaultMonitorSimpleData(getNextMonitorIndex());
		$.extend(simpleData, monitorsLan);
		//console.log(simpleData);
		//_monitorObj=simpleData;
		initMonitorDataSimple(simpleData);
	}
	//显示'简单配置项'弹窗
	function showAddMonitorSimple(){
		//console.log('showAddMonitorSimple');
		
		var simpleData = getDefaultMonitorSimpleData(getNextMonitorIndex());
		//$.extend(_monitorObj,simpleData)
		//console.log(_monitorObj);
		initMonitorDataSimple(simpleData);
	}
	//填充表单数据
	function initMonitorDataSimple(simpleData){
		//... = simpleData.xxx
		//console.log(simpleData);
		//设置监视器Id
		$("[id='simple-newMonitor[Id]']").val(simpleData.Id);
		//设置左上角标题
		$("#popup_monitor_simple_title").text(simpleData.Name);
		//General面板
		$("[id='simple-newMonitor[Name]']").val(simpleData.Name);
		$("[id='simple-newMonitor[Type]']").val(simpleData.Type);
		$("[id='simple-newMonitor[Protocol]']").val(simpleData.Protocol);
		$("[id='simple-newMonitor[Method]']").val(simpleData.Method);
		$("[id='simple-newMonitor[User]']").val(simpleData.User);
		$("[id='simple-newMonitor[Pass]']").val(simpleData.Pass);
		$("[id='simple-newMonitor[IP]']").val(simpleData.IP);
		$("[id='simple-newMonitor[Port]']").val(simpleData.Port);
		$("[id='simple-newMonitor[Path]']").val(simpleData.Path);
		$("[id='simple-newMonitor[Width]']").val(simpleData.Width);
		$("[id='simple-newMonitor[Height]']").val(simpleData.Height);
		$("[id='simple-newMonitor[MaxFPS]']").val(simpleData.MaxFPS);
		//若simpleData.Path的值存在则移除拼接path的相关事件,不存在则前面的值赋好后手动触发进行path的拼接
		if(!simpleData.Path){
			$("[id='simple-newMonitor[Protocol]'],[id='simple-newMonitor[Name]'],[id='simple-newMonitor[User]'],[id='simple-newMonitor[Pass]'],[id='simple-newMonitor[IP]'],[id='simple-newMonitor[Port]']").on("input",function(){
				var Protocol=$("[id='simple-newMonitor[Protocol]']").val();
				var User=$("[id='simple-newMonitor[User]']").val();
				var Pass=$("[id='simple-newMonitor[Pass]']").val();
				var IP=$("[id='simple-newMonitor[IP]']").val();
				var Port=$("[id='simple-newMonitor[Port]']").val();
				if(Protocol && User && Pass && IP){
					$("[id='simple-newMonitor[Path]']").val(Protocol+"://"+User+":"+Pass+"@"+IP+(Port?":"+Port:""));
				}else{
					$("[id='simple-newMonitor[Path]']").val("");
				}
			});
			$("[id='simple-newMonitor[Protocol]']").trigger("input");
		}
		else{
			$("[id='simple-newMonitor[Protocol]'],[id='simple-newMonitor[Name]'],[id='simple-newMonitor[User]'],[id='simple-newMonitor[Pass]'],[id='simple-newMonitor[IP]'],[id='simple-newMonitor[Port]']").off("input");
		}
		

		$("#popup_monitor_prob").hide();
		$('#popup_monitor_simple').show();
	}
	//获取表单数据
	function getMonitorDataSimple(){
		var simpleData = {};
		//simpleData.xxx = ...
		simpleData.Id=$("[id='simple-newMonitor[Id]']").val();
		simpleData.Name=$("[id='simple-newMonitor[Name]']").val();
		simpleData.Type=$("[id='simple-newMonitor[Type]']").val();
		simpleData.Protocol=$("[id='simple-newMonitor[Protocol]']").val();
		simpleData.Method=$("[id='simple-newMonitor[Method]']").val();
		simpleData.User=$("[id='simple-newMonitor[User]']").val();
		simpleData.Pass=$("[id='simple-newMonitor[Pass]']").val();
		simpleData.IP=$("[id='simple-newMonitor[IP]']").val();
		simpleData.Port=$("[id='simple-newMonitor[Port]']").val();
		simpleData.Path=$("[id='simple-newMonitor[Path]']").val();
		simpleData.Width=$("[id='simple-newMonitor[Width]']").val();
		simpleData.Height=$("[id='simple-newMonitor[Height]']").val();
		simpleData.MaxFPS=$("[id='simple-newMonitor[MaxFPS]']").val();

		
		return simpleData;
	}
	
	function hideAddMonitorSimple(){
		$('#popup_monitor_simple').hide();
	}


	
	//显示'复杂配置项'弹窗
	function showEditMonitorComprehensive(comprehensiveData){
		//console.log('showEditMonitorComprehensive');
		
		if(window.zm.showEditMonitorComprehensive){
			window.zm.showEditMonitorComprehensive(comprehensiveData);
		}
	}

	//删除监视器,回调在删除监视器请求成功后发生，一般是在前端做移除监视器的功能
	function deleteMointor(monitorId,callback){
		//console.log(monitorId);
		$.ajax({
			url: "/zm/api/monitors/"+monitorId+".json?token="+window.zm.access_token,
			type: "DELETE",
			dataType: "json",
			async: true,
			success: function(data){
				//console.log(data);
				promptShow(data.status);
				callback();
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log(xhr);
				promptShow(xhr.responseJSON.message);
			}
		});
	}
	//===================================================================================
	
	
	
	
	function showWaiting(){
		$('#loading_monitor').show();
	}
	
	function hideWaiting(){
		$('#loading_monitor').hide();
	}
	
	function getTrimValue(id){
		return $.trim($(id).val());
	}

	//token过期并重新获取后,且当前选项卡处于预览页面时调用，一般用于刷新数据
    function update(){
    	updateMonitorList();
    }
	
	window.zm = window.zm || {};
	window.zm.updateMonitorList = updateMonitorList;
	window.zm.updateMonitorEdited = updateMonitorEdited;
	window.zm._monitorObj=_monitorObj;
	
	window.zm.init = window.zm.init || [];
	window.zm.init['monitor'] = init;
	window.zm.destroy = window.zm.destroy || [];
	window.zm.destroy['monitor'] = destroy;
	window.zm.update = window.zm.update || [];
	window.zm.update['monitor'] = update;


})();


function addUniqueConnkey(arr){
	for(var i=0,len=arr.length; i<len; ++i){
		arr[i].Monitor.connkey = parseInt(Math.random()*1000000);
		arr[i].Monitor.scale = 60; //默认60%的显示质量
	}
}


function generateTestMonitorsLan(num){
	var arr = [];
	var obj;
	for(var i=1; i<=num; ++i){
		obj = {};
		obj.Name = myUNAS._("##$@@$##监视器##$@@$##")+"-"+i;						//名称
		obj.Ip = "192.168.0.230";					//远程主机IP
		obj.Protocol = "rtsp";						//远程协议
		
		arr.push(obj);								
	}
	
	return arr;
}

function getDefaultMonitorSimpleData(index){
	var obj = {};
	obj.Name =myUNAS._("##$@@$##监视器##$@@$##")+"-"+index;							//名称
	obj.Id = ""+index;								//监视器ID
	obj.Function = "Monitor";						//功能
	obj.Host = "";	//远程主机名（远程主机用户名:远程主机密码@远程主机IP）
	obj.Method = "rtpRtsp";								//远程方法
	obj.Pass = "";									//远程主机密码
	obj.Ip = "";									//远程主机IP
	obj.Path = "";    								//信号源路径
	obj.Port = "";									//远程主机端口
	obj.Protocol = "http";								//远程协议
	obj.Type = "Ffmpeg";							//信号源类型
	obj.User = "";									//远程主机用户名
	
	return obj;
}


function generateTestMonitors(num){
	var arr = [];
	var obj;
	for(var i=1; i<=num; ++i){
		obj = {'Monitor':{}, 'Monitor_Status':{}};
		obj.Monitor.Name = "hik-0"+i;							//名称
		obj.Monitor.Id = ""+i;									//监视器ID
		obj.Monitor.Function = "Monitor";						//功能
		obj.Monitor.Host = "admin:fzj19981018@192.168.0.230";	//远程主机名（远程主机用户名:远程主机密码@远程主机IP）
		obj.Monitor.Method = "rtpRtsp";							//远程方法
		obj.Monitor.Pass = "fzj19981018";						//远程主机密码
		obj.Monitor.Ip = "192.168.0.230";						//远程主机IP
		obj.Monitor.Path = "rtsp://admin:fzj19981018@192.168.0.230/onvif";    //信号源路径
		obj.Monitor.Port = "554";								//远程主机端口
		obj.Monitor.Protocol = "rtsp";							//远程协议
		obj.Monitor.Type = "Ffmpeg";							//信号源类型
		obj.Monitor.User = "admin";								//远程主机用户名
		arr.push(obj);
	}
	
	return arr;
}
function getDefaultMonitorData(index){
	var obj = {};
	obj.AlarmFrameCount = "1";
    obj.AlarmMaxFPS = null;
    obj.AlarmRefBlendPerc = "6";
    obj.AnalysisFPSLimit = null;
    obj.AnalysisUpdateDelay = "0";
    obj.ArchivedEventDiskSpace = "28426251";
    obj.ArchivedEvents = "1";
    obj.AutoStopTimeout = null;
    obj.Brightness = "-1";
    obj.Channel = "0";
    obj.Colour = "-1";
    obj.Colours = "4";
    obj.Contrast = "-1";
    obj.ControlAddress = null;
    obj.ControlDevice = null;
    obj.ControlId = "27";
    obj.Controllable = "0";
    obj.DayEventDiskSpace = "933077886";
    obj.DayEvents = "5";
    obj.DecoderHWAccelDevice = null;
    obj.DecoderHWAccelName = null;
    obj.DefaultCodec = "auto";
    obj.DefaultRate = "100";
    obj.DefaultScale = "0";
    obj.Deinterlacing = "0";
    obj.Device = "";
    obj.Enabled = "1";
    obj.EncoderParameters = "# Lines beginning with # are a comment \r\n# For changing quality, use the crf option\r\n# 1 is best, 51 is worst quality\r\n#crf=23";
    obj.EventPrefix = "Event-";
    obj.Exif = false;
    obj.FPSReportInterval = "100";
    obj.Format = "255";
    obj.FrameSkip = "0";
    obj.Function = "None";						//功能
    obj.Height = "";
    obj.Host = "";								//远程主机名（远程主机用户名:远程主机密码@远程主机IP）
    obj.HourEventDiskSpace = "0";
    obj.HourEvents = "0";
    obj.Hue = "-1";
    obj.Id = "";								//监视器ID
    obj.ImageBufferCount = "20";
    obj.LabelFormat = "%N - %d/%m/%y %H:%M:%S";
    obj.LabelSize = "1";
    obj.LabelX = "0";
    obj.LabelY = "0";
    obj.LinkedMonitors = null;
    obj.MaxFPS = null;
    obj.Method = "TCP";							//远程方法
    obj.MinSectionLength = "10";
    obj.MonthEventDiskSpace = "933077886";
    obj.MonthEvents = "5";
    obj.MotionFrameSkip = "0";
    obj.Name = myUNAS._('##$@@$##监视器##$@@$##')+"-"+index;		//名称
    obj.Notes = "";
    obj.Options = null;
    obj.Orientation = "ROTATE_0";
    obj.OutputCodec = null;
    obj.OutputContainer = null;
    obj.Palette = "0";
    obj.Pass = null;							//远程主机密码
    obj.Path = "";								//信号源路径
    obj.Port = "";								//远程主机端口
    obj.PostEventCount = "5";
    obj.PreEventCount = "5";
    obj.Protocol = "rtsp";						//远程协议
    obj.RTSPDescribe = false;
    obj.RecordAudio = "1";
    obj.RefBlendPerc = "6";
    obj.Refresh = null;
    obj.ReturnDelay = null;
    obj.ReturnLocation = "-1";
    obj.SaveJPEGs = "0";
    obj.SectionLength = "600";
    obj.Sequence = "1";
    obj.ServerId = "0";
    obj.SignalCheckColour = "#0000be";
    obj.SignalCheckPoints = "0";
    obj.StorageId = "0";
    obj.StreamReplayBuffer = "0";
    obj.SubPath = "";
    obj.TotalEventDiskSpace = "933077886";
    obj.TotalEvents = "5";
    obj.TrackDelay = null;
    obj.TrackMotion = "0";
    obj.Triggers = "";
    obj.Type = "Ffmpeg";                          //信号源类型
    obj.User = null;                              //远程主机用户名
    obj.V4LCapturesPerFrame = "1";
    obj.V4LMultiBuffer = null;
    obj.VideoWriter = "2";
    obj.WarmupCount = "0";
    obj.WebColour = "#b08465";
    obj.WeekEventDiskSpace = "933077886";
    obj.WeekEvents = "5";
    obj.Width = "";
    obj.ZoneCount = "1";

    //以下是前端维护的属性
    obj.connkey = '';               //a random number which uniquely identifies a stream generated by ZM   
                                	//can use connkey to “control” the stream (pause/resume etc.)  
	obj.scale = 60;                 //监视器显示质量   
    obj.isRemovedFromScreen = false;//是否已被删除（前端删除操作时标记）
    obj.isStreamWaiting = false;	//是否正在进行视频流操作
    obj.lastGetStatusStartTime = 0;	//上一次发出getStatus请求时的时间戳（单位：毫秒）
    obj.lastGetStatusTimer = null;	//上一次发出getStatus请求的timer（用于后续调用clearTimeout）
	
	return obj;
}




