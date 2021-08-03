(function(){
	var _isLocalDebug = getParameterURL('localDebug');
	var _recordsOriginal = [];
	var _records = [];
	var _recordIndex = 0;
	var _targetRecordIndex;
	
	var _pageCount = 0; //总页数
	var _pageNum = 1; //当前页号（下标从1开始）
	var _$pagination;
	var PAGE_SIZE = 25;
	
	var _startGetStatusTimer;
	var REFRESH_INTERVAL = 2000; //获取监视器状态 轮询请求间隔（单位：毫秒）
	var _forceStopStatusTimer = false;
	
	var _monitor_ratio = 16/9; //监视器宽高比
	var _monitorThumbWidth;
	var _monitorThumbHeight;
	
	var _foldRecordListTimer;
	var FOLD_INTERVAL = 3000; //初始加载时，缩回右边回访列表的时间间隔（单位：毫秒）
	
	function init(){
		//console.log('init event');
		
		_recordIndex = 0;
		
		_pageCount = 0; //总页数
		_pageNum = 1; //当前页号（下标从1开始）
		_$pagination = jQuery('#record_pagination');
		
		_monitor_ratio = 16/9;
		
		
		//获取监视器列表
		getMonitorList(function(monitorDatas){
			if(_isLocalDebug){
				monitorDatas = generateTestMonitors(3);
			}
			
			$('#record_sel_monitor').empty();
			var str = '<option value="">'+myUNAS._('全部')+'</option>';
			for(var i=0,len=monitorDatas.length; i<len; ++i){
				str += '<option value="'+monitorDatas[i].Monitor.Id+'">'+monitorDatas[i].Monitor.Name+'</option>';
			}
			$('#record_sel_monitor').append(str);
		});
		//左上方监视器选择
		$('#record_sel_monitor').on('change',function(){
			doGetRecordList(true);
		});
		
		//右上方编码选择
		$('#record_sel_codec').on('change',function(){
			var codec = $(this).val();
			attachMonitorRecord(_recordIndex, codec);
		});
		
		//右上方宽高比选择
		$('#record_sel_ratio').on('change',function(){
			var value = $(this).val();
			
			if(value == '16/9'){
				_monitor_ratio = 16/9;
			}else if(value == '4/3'){
				_monitor_ratio = 4/3;
			}else if(value == '1/1'){
				_monitor_ratio = 1;
			}
			
			updateMonitor();
		});
		
		//右上方清晰度选择
		$('#record_sel_scale').on('change',function(){
			_records[_recordIndex].scale = $(this).val();
			var streamMjpegSrc = window.zm.cgiBinUrl+'?mode=jpeg&frame=1&rate=100&maxfps=30&replay=single&source=event'
										+'&scale='+_records[_recordIndex].scale
										+'&event='+_records[_recordIndex].Id
										+'&token='+window.zm.access_token
										+'&connkey='+_records[_recordIndex].connkey
										+'&rand='+Math.random();
			$('#screen_mjpeg_'+_recordIndex).attr('src', streamMjpegSrc);
		});
		
		//右上方尺寸选择
		$('#record_sel_size').on('change',function(){
			var value = Number($(this).val());
			
			updateMonitor();
			attachMonitorRecord(_recordIndex, 'auto');
		});
		
		//右上方刷新按钮
		$("#event-refreshBtn").on("click",function(){
			$("#record_sel_monitor").trigger("change");
		})
		
		$('#btn_handler').on('click',function(){
			$('#record_list_container').toggleClass('unfolded');
		});
		
		
		initYearMonthDate();
		
		
		//设置滚动条
		$("#record_table_scroll_container").mCustomScrollbar({
			autoHideScrollbar:false,
			theme:"minimal-dark",
			scrollInertia: 200
		});
		
		$(window).on('resize',function(){
			updateMonitor();
		});
		
		doGetRecordList(true); //获取回放列表
		
		
		/*
		***********************************************************************
									翻译
		***********************************************************************
		 */
		//注册页面翻译函数
		window.addTranslationEvent(function(){
			if(myUNAS.CurrentLanguage == 'English'){
				$('.wrapper-record').removeClass('en').addClass('en');
			}else{
				$('.wrapper-record').removeClass('en');
			}
		});

		//执行翻译
		window.unasTranslation(myUNAS.CurrentLanguage);
	}
	function destroy(){
		//console.log('destroy event');
		
		if(_foldRecordListTimer){
			clearTimeout(_foldRecordListTimer);
		}
		
		if(_startGetStatusTimer){
			clearTimeout(_startGetStatusTimer);
		}
		
		//停止所有监视器的状态轮询请求
		stopGetStatus();
	}
	
	//年月日筛选
	function initYearMonthDate(){
		var dateCurrent = new Date();
		var yearCurrent = dateCurrent.getFullYear();
		var monthCurrent = dateCurrent.getMonth();
		var dateCurrent = dateCurrent.getDate();
		var yearSelected = yearCurrent;
		var monthSelected = monthCurrent;
		var dateSelected = dateCurrent;
		
		//初始化年选项
		$('#record_sel_year').html(generateYearOptions(2020, yearCurrent));
		selectOptionByValue(document.getElementById('record_sel_year'),yearSelected);
		
		//设置月日选项
		setMonthAndDate();
		
		//设置月日选项
		function setMonthAndDate(){
			// //console.log('yearSelected:'+yearSelected);
			// //console.log('monthSelected:'+monthSelected);
			// //console.log('dateSelected:'+dateSelected);
		
			//初始化月日选项
			if(yearSelected == yearCurrent){
				$('#record_sel_month').html(generateMonthOptions(monthCurrent));
				
				if(monthSelected == monthCurrent){
					$('#record_sel_date').html(generateDateOptions(dateCurrent));
				}else{
					$('#record_sel_date').html(generateDateOptions(getMonthDay(monthSelected,yearSelected)));
				}
			}else{
				$('#record_sel_month').html(generateMonthOptions(11));
				$('#record_sel_date').html(generateDateOptions(getMonthDay(monthSelected,yearSelected)));
			}
		
			//选择年月日选项
			if(!selectOptionByValue(document.getElementById('record_sel_month'),monthSelected)){
				monthSelected = 0;
			}
			if(!selectOptionByValue(document.getElementById('record_sel_date'),dateSelected)){
				dateSelected = 0;
			}
		}
		
		$('#record_sel_year').on('change',function(){
			yearSelected = $(this).val();
			setMonthAndDate();
			
			doGetRecordList(true);
		});
		$('#record_sel_month').on('change',function(){
			monthSelected = $(this).val();
			setMonthAndDate();
			
			doGetRecordList(true);
		});
		$('#record_sel_date').on('change',function(){
			dateSelected = $(this).val();
			doGetRecordList(true);
		});
		
		//将值为value的option设为选中状态
		function selectOptionByValue(select,value){
			var found = false;
			for(var i=0, len=select.options.length; i<len; i++) {  
				if(select.options[i].value == value) {  
					select.options[i].selected = true;  
					found = true;
					break;
				}  
			}
			if(!found && select.options[0]){
				//如果找不到对应值，默认选择第一个选项
				select.options[0].selected = true;
				return false;
			}
			
			return true;
		}
		
		//拼接年份选项字符串
		function generateYearOptions(start, end){
			var _str = '';
			for (var i=start; i<=end; i++) {
				if(myUNAS.CurrentLanguage == '简体中文'){
					_str += '<option value="' + i + '">' + i + '年</option>';
				}else{
					_str += '<option value="' + i + '">' + i + '</option>';
				}
			}
			return _str;
		}
		//拼接月份选项字符串
		function generateMonthOptions(end){
			var _str = '';
			for (var i=0; i<=end; i++) {
				if(myUNAS.CurrentLanguage == '简体中文'){
					_str += '<option value="' + i + '">' + (i+1) + '月</option>';
				}else{
					_str += '<option value="' + i + '">' + (i+1) + '</option>';
				}
			}
			return _str;
		}
		//拼接日期选项字符串
		function generateDateOptions(end){
			var _str = '';
			for (var i=1; i<=end; i++) {
				if(myUNAS.CurrentLanguage == '简体中文'){
					_str += '<option value="' + i + '">' + i + '日</option>';
				}else{
					_str += '<option value="' + i + '">' + i + '</option>';
				}
			}
			return _str;
		}
		
		//是否闰年
		function isLeapYear(year){
		    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
		};
		
		//获取每月天数
		//month are zero indexed
		function getMonthDay(month, year) {
		  var monthDay = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
		  if (month == 1 && isLeapYear(year)) {
		    return 29;
		  } else {
		    return monthDay[month];
		  }
		}
	}
	
	function updateMonitor(){
		getMonitorSize();
		$('.monitor-thumb-record').css({'width':_monitorThumbWidth, 'height':_monitorThumbHeight});
		$('.video-player-record').css({'width':_monitorThumbWidth, 'height':_monitorThumbHeight});
	}
	function getMonitorSize(){
		var value = Number($('#record_sel_size').val());
		if(value == 0){
			var _width = $('#monitor_left_view').width();
			var _height = $('#monitor_left_view').height();
			if(_width/_height >= _monitor_ratio){
				_monitorThumbHeight = _height;
				_monitorThumbWidth = _height*_monitor_ratio;
			}else{
				_monitorThumbWidth = _width;
				_monitorThumbHeight = _width/_monitor_ratio;
			}
		}else{
			var recordData = _records[_recordIndex];
			if(recordData){
				_monitorThumbWidth = parseInt(recordData.Width) * value/100;
				_monitorThumbHeight = parseInt(recordData.Height) * value/100;
			}else{
				var _width = $('#monitor_left_view').width();
				var _height = $('#monitor_left_view').height();
				if(_width/_height >= _monitor_ratio){
					_monitorThumbHeight = _height;
					_monitorThumbWidth = _height*_monitor_ratio;
				}else{
					_monitorThumbWidth = _width;
					_monitorThumbHeight = _width/_monitor_ratio;
				}
			}
		}
	}
	
	
	
	//获取回放列表
	function doGetRecordList(needInitPagination){
		showWaiting();
		
		//重置回放索引
		_recordIndex = 0;
		
		//本地调试
		if(_isLocalDebug){
			setTimeout(function(){
				_recordsOriginal = generateTestEvents(10);
				addUniqueRecordConnkey(_recordsOriginal);
				
				_records = _recordsOriginal;
				attachRecords(_records);
				hideWaiting();
				
				// 暂时没有分页功能
				// if(needInitPagination){
					// _pageCount = 5;
					// initPagination(_pageCount);
				// }
						
				// showNoticeEmpty();
				// hideWaiting();
			},1000);
			return;
		}
		
		var year = $('#record_sel_year').val();
		var month = $('#record_sel_month').val();
		var date = $('#record_sel_date').val();
		var startDate = new Date(year, month, date);
		var startTime = formatDate(startDate.getTime(), false)+' 00:00:00';
		
		//var endDate = new Date();
		var endDate = new Date(year, month, date, 23, 59, 59);
		var endTime = formatDate(endDate.getTime(), true);
		
		var reqUrl;
		var	monitorId = $('#record_sel_monitor').val();
		//console.log('startTime:'+startTime+' endTime:'+endTime);
		
		if(monitorId){
			reqUrl = "/zm/api/events/index/MonitorId:"+monitorId+"/StartTime >=:"+startTime+"/EndTime <=:"+endTime+".json"
						+"?token="+window.zm.access_token+"&page=1";
		}else{
			reqUrl = "/zm/api/events/index/StartTime >=:"+startTime+"/EndTime <=:"+endTime+".json"
						+"?token="+window.zm.access_token+"&page=1";
		}
		jQuery.ajax({
			url: reqUrl,
			type: "GET",
			async: true,
			dataType: 'json',
			success: function (data) {
				
				if(data && data.events && data.events.length>0){
					var arr = [];
					for(var i=0, len=data.events.length; i<len; ++i){
						arr.push(data.events[i].Event);
					}
					_recordsOriginal = arr;
					addUniqueRecordConnkey(_recordsOriginal);
					
					_records = _recordsOriginal;
					attachRecords(_records);
					
					// 暂时没有分页功能
					// if(needInitPagination && data.pagination.pageCount>1){
						// _pageCount = data.pagination.pageCount;
						// initPagination(_pageCount);
					// }
				}else{
					showNoticeEmpty();
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event event_list error textStatus:' + textStatus);
			},
			complete: function(){
				hideWaiting();
			}
		});
	}
				
	
	function generatePaginationDataSource(len){
		var arr = [];
		for(var i=1; i<=len; ++i){
			arr.push(i);
		}
		return arr;
	}
	function initPagination(pageCount){
		if(_$pagination.pagination){
			try{
				_$pagination.pagination('destroy');
			}catch(err){}
		}
		//console.log('initPagination pageCount:'+pageCount);
		_$pagination.pagination({
			className: 'paginationjs-small',
			dataSource: generatePaginationDataSource(pageCount*PAGE_SIZE),
			pageSize: PAGE_SIZE,
			triggerPagingOnInit: false,
			callback: function(data, pagination) {
		        _pageNum = pagination.pageNumber; //当前页号（下标从1开始）
		        //console.log('_pageNum:'+_pageNum);
		        
				doGetRecordList(false);
		    }
		});
	}
	
	function showNoticeEmpty(){
		//alert('当前选择日期没有回放记录');
		$('#record_notice_empty').show();
		$('#monitor_left_view').hide();
		
		removeEvents();
		$('#record_table').empty();
		
		
		
		$('#setting_item_codec').hide();
		//停止所有监视器的状态轮询请求
		stopGetStatus();
		
		var $monitorContainer = $('#monitor_thumb_record_container');
		$monitorContainer.hide();
		removeMonitorEvents();
		$monitorContainer.empty();
		
		var $videoPlayerContainer = $('#monitor_video_player_container');
		$videoPlayerContainer.hide();
		$videoPlayerContainer.empty();
	}
	
	
	function attachRecords(records){
		if(_records.length == 0) return;
		
		$('#record_notice_empty').hide();
		$('#monitor_left_view').show();
		
		var $recordTable = $('#record_table');
		
		removeEvents();
		$recordTable.empty();
		
		var str = '';
		for(var i=0,len=records.length; i<len; ++i){
			//至少在Storage设置页选择了'保存为视频'或者'保存为JPEGs'，才会生成回放数据
			//console.log(i+' records[i].Videoed:'+records[i].Videoed);
			//console.log(i+' records[i].SaveJPEGs:'+records[i].SaveJPEGs);
			if(parseInt(records[i].Videoed)==0 && parseInt(records[i].SaveJPEGs)==0){
				continue;
			}
			
			str += '<tr class="tr_record" id="tr_record_'+i+'" data-ref="'+i+'">';
				str += '<td class="td_record_name">'+records[i].Name+'</td>';
				str += '<td class="td_record_length">'+records[i].Length+myUNAS._('秒')+'</td>';
				str += '<td class="td_record_operation">';
					str += '<div class="td_icon td_record_delete" data-ref="'+i+'"></div>';
				str += '</td>';
			str += '</tr>';
		}
		
		$recordTable.append(str);
		addEvents();
		
		if($("#record_table_scroll_container").mCustomScrollbar){
			$("#record_table_scroll_container").mCustomScrollbar("scrollTo","top",{ scrollInertia:0 });
		}
		
		//为当前选中的thumb添加active样式
		$('#tr_record_'+_recordIndex).addClass('active');
		if(!$('#record_list_container').hasClass('unfolded')){
			$('#record_list_container').addClass('unfolded');
		}
		attachMonitorRecord(_recordIndex, 'auto');
	}
	function getRecordLength(record){
		return parseInt((new Date(record.EndTime)-new Date(record.StartTime))/10)/100;
	}
	function addEvents(){
		$('.tr_record').on('click',function(){
			var $that = $(this);
			if($that.hasClass('active')) return;
			
			var index = $that.data('ref');
			_recordIndex = index;
			$('.tr_record').removeClass('active');
			$('#tr_record_'+index).addClass('active');
			
			attachMonitorRecord(_recordIndex, 'auto');
		});
		
		$('.td_record_delete').on('click',function(){
			_targetRecordIndex = $(this).data('ref');
			
			showConfirmDelete(deleteRecord);
		});
	}
	function removeEvents(){
		$('.td_record_delete').off();
		$('.tr_record').off();
	}
	
	function deleteRecord(){
		showWaiting();
		
		jQuery.ajax({
			url: "/zm/api/events/"+_records[_targetRecordIndex].Id+".json?token="+window.zm.access_token,
			type: "DELETE",
			async: true,
			dataType: 'text',
			success: function (data) {
				promptShow('删除成功');
				
				$('#tr_record_'+_targetRecordIndex).remove();
				if(_recordIndex == _targetRecordIndex){
					doGetRecordList();
				}else{
					hideWaiting();
				}
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event delete error textStatus:' + textStatus);
				promptShow('删除失败');
				hideWaiting();
			}
		});
	}
	
	function attachMonitorRecord(index, codec){
		if(_records.length == 0) return;
		
		//停止所有监视器的状态轮询请求
		stopGetStatus();
		
		if(codec == 'auto'){
			$('#setting_item_codec').hide();
		}
		
		
		getMonitorSize();
		
		var $monitorContainer = $('#monitor_thumb_record_container');
		$monitorContainer.hide();
		removeMonitorEvents();
		$monitorContainer.empty();
		
		var $videoPlayerContainer = $('#monitor_video_player_container');
		$videoPlayerContainer.hide();
		$videoPlayerContainer.empty();
		
		
		var recordData = _records[index];
		
		//显示 视频
		if(codec == 'MP4' || (codec == 'auto' && parseInt(recordData.Videoed) != 0)){
			var str = ''; 
			str += '<div class="video-player-record" style="width:'+_monitorThumbWidth+'px; height:'+_monitorThumbHeight+'px">';
				str += '<video id="video_record" class="video-js vjs-default-skin vjs-big-play-centered" controls autoplay width="100%" height="100%" data-setup="{}">';
					var videoUrl = '/zm/index.php?view=view_video'
									+'&eid='+recordData.Id
									+'&token='+window.zm.access_token;
					str += '<source src="'+videoUrl+'" type="video/mp4" />';
				str += '</video>';
			str += '</div>';
			
			$videoPlayerContainer.append(str);
			$videoPlayerContainer.show();
			videojs("video_record");
			
		}
		//显示 回放流静帧
		else if(codec == 'MJPEG' || (codec == 'auto' && parseInt(recordData.SaveJPEGs) != 0)){
			var str = ''; 
			str += '<div class="monitor-thumb-record" data-ref="'+index+'" style="width:'+_monitorThumbWidth+'px; height:'+_monitorThumbHeight+'px">';
				str += '<div class="monitor-container">';
					str += '<img class="loading-icon" src="./images/ajax-loader.gif"> ';
					str += '<div class="screen-container flex-center">';
						var streamMjpegSrc = window.zm.cgiBinUrl+'?mode=jpeg&frame=1&rate=100&maxfps=30&replay=single&source=event'
										+'&scale='+recordData.scale
										+'&event='+recordData.Id
										+'&token='+window.zm.access_token
										+'&connkey='+recordData.connkey
										+'&rand='+Math.random();
						str += '<img class="screen-mjpeg" id="screen_mjpeg_'+index+'" data-ref="'+index+'" src="'+streamMjpegSrc+'" />';
					str += '</div>';

					// str += '<div class="name-container hide">'+recordData.MonitorId+'</div>';
					
					str += '<div class="control-panel-container hide">';
						str += '<div class="control-panel">';
							str += '<button class="zm-btn-media zm-btn-media-pause inactive" id="zm_btn_media_pause_record_'+index+'" data-ref="'+index+'"></button>';
							str += '<button class="zm-btn-media zm-btn-media-play inactive" id="zm_btn_media_play_record_'+index+'" data-ref="'+index+'"></button>';
							str += '<button class="zm-btn-media zm-btn-media-zoomout inactive" id="zm_btn_media_zoomout_record_'+index+'" data-ref="'+index+'"></button>';
						str += '</div>';
						str += '<div class="control-panel-status" id="cp_status_record_'+index+'">'+myUNAS._('模式：')+myUNAS._('回放')+'</div>';
					str += '</div>';
					str += '<div class="progress-bar" id="progress_bar_'+index+'" data-ref="'+index+'">';
						str += '<div class="progress-thumb" id="progress_thumb_'+index+'"></div>';
					str += '</div>';
				str += '</div>';
			str += '</div>';
			
			$monitorContainer.append(str);
			$monitorContainer.show();
			addMonitorEvents();
			
			//开始所有监视器的状态轮询请求
			startGetStatus();
		}
		
		var value = Number($('#record_sel_size').val());
		if(value == 0){
			$('#monitor_thumb_record_container').css('overflow','hidden');
			$('#monitor_video_player_container').css('overflow','hidden');
			$('.monitor-thumb-record').removeClass('rel');
			$('.video-player-record').removeClass('rel');
		}else{
			$('#monitor_thumb_record_container').css('overflow','scroll');
			$('#monitor_video_player_container').css('overflow','scroll');
			$('.monitor-thumb-record').addClass('rel');
			$('.video-player-record').addClass('rel');
		}
		
		if(codec == 'auto'){
			//如果当前回放资源即支持视频有支持视频流，则显示编码选项
			if(parseInt(recordData.Videoed) != 0 && parseInt(recordData.SaveJPEGs) != 0){
				$('#setting_item_codec').show();
				$('#record_sel_codec').val('MP4');
			}
			
			if(_foldRecordListTimer){
				clearTimeout(_foldRecordListTimer);
			}
			_foldRecordListTimer = setTimeout(function(){
				$('#record_list_container').removeClass('unfolded');
			},FOLD_INTERVAL);
		}
	}
	
	function addMonitorEvents(){
		$('.monitor-thumb-record').mouseenter(function(){
			//$(this).find('.name-container').show();
			$(this).find('.control-panel-container').show();
		});
		$('.monitor-thumb-record').mouseleave(function(){
			//$(this).find('.name-container').hide();
			$(this).find('.control-panel-container').hide();
		});
		
		$('.monitor-thumb-record .progress-bar').click(function(e){
			var index = $(this).data('ref');
			//console.log('progress mjpeg index:'+index);
			$('#progress_thumb_'+index).css('width',e.offsetX);
			var percent = e.offsetX/$(this).width();
			//console.log('percent:'+percent);
			
			doSeekStreamMjpeg(index, percent);
		});
		
		//zoomin'流静帧'（点击'流静帧'，在点击处zoomin）
		$('.monitor-thumb-record .screen-mjpeg').click(function(e){
			var index = $(this).data('ref');
			//console.log('zoomin mjpeg index:'+index);
			//console.log('e.offsetX:'+e.offsetX+' e.offsetY:'+e.offsetY);
			doZoominStreamMjpeg(index, e.offsetX, e.offsetY);
		});
		//zoomout'流静帧'
		$('.monitor-thumb-record .zm-btn-media-zoomout').click(function(e){
			var $that = $(this);
			if($that.hasClass('active') || $that.hasClass('inactive')) return;
			
			var index = $that.data('ref');
			//console.log('zoomout mjpeg index:'+index);
			doZoomoutStreamMjpeg(index);
		});
		
		//pause'流静帧'
		$('.monitor-thumb-record .zm-btn-media-pause').click(function(e){
			var $that = $(this);
			if($that.hasClass('active') || $that.hasClass('inactive')) return;
			
			var index = $that.data('ref');
			//console.log('pause mjpeg index:'+index);
			doPauseStreamMjpeg(index);
		});
		
		//play'流静帧'
		$('.monitor-thumb-record .zm-btn-media-play').click(function(e){
			var $that = $(this);
			if($that.hasClass('active') || $that.hasClass('inactive')) return;
			
			var index = $that.data('ref');
			//console.log('play mjpeg index:'+index);
			doPlayStreamMjpeg(index);
		});
	}
	function removeMonitorEvents(){
		$('.zm-btn-media-pause').off();
		$('.zm-btn-media-play').off();
		$('.zm-btn-media-zoomout').off();
		$('.screen-mjpeg').off();
		
		$('.progress-bar').off();
		
		$('.monitor-thumb-record').off();
	}
	
	
	// seek'流静帧'（command=14）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=14&offset=7.406577516026112
	function doSeekStreamMjpeg(dataIndex, percent){
		var recordData = _records[dataIndex];
		if(recordData.isStreamWaiting) return;
		
		//console.log('command-14 seek offset:'+recordData.Length*percent);
		
		recordData.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+recordData.connkey+
											'&token='+window.zm.access_token+
											'&command=14'+
											'&offset='+recordData.Length*percent;
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
					//console.log('event stream_mjpeg seek failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event stream_mjpeg seek error textStatus:' + textStatus);
			},
			complete: function(){
				recordData.isStreamWaiting = false;
			}
		});
	}
	
	
	// play'流静帧'（command=2）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=2
	function doPlayStreamMjpeg(dataIndex){
		var recordData = _records[dataIndex];
		if(recordData.isStreamWaiting) return;
		
		//console.log('command-2 connkey:'+recordData.connkey);
		
		recordData.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+recordData.connkey+
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
					//console.log('event stream_mjpeg play failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event stream_mjpeg play error textStatus:' + textStatus);
			},
			complete: function(){
				recordData.isStreamWaiting = false;
			}
		});
	}
	
	// pause'流静帧'（command=1）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=1
	function doPauseStreamMjpeg(dataIndex){
		var recordData = _records[dataIndex];
		if(recordData.isStreamWaiting) return;
		
		//console.log('doPauseStreamMjpeg dataIndex:'+dataIndex);
		
		recordData.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+recordData.connkey+
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
					//console.log('event stream_mjpeg pause failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event stream_mjpeg pause error textStatus:' + textStatus);
			},
			complete: function(){
				recordData.isStreamWaiting = false;
			}
		});
	}
	
	
	// zoomout'流静帧'（command=9）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117&command=9
	function doZoomoutStreamMjpeg(dataIndex){
		var recordData = _records[dataIndex];
		if(recordData.isStreamWaiting) return;
		
		recordData.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+recordData.connkey+
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
					//console.log('event stream_mjpeg zoomout failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event stream_mjpeg zoomout error textStatus:' + textStatus);
			},
			complete: function(){
				recordData.isStreamWaiting = false;
			}
		});
	}
	
	
	// zoomin'流静帧'（command=8）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=8&x=182&y=149
	function doZoominStreamMjpeg(dataIndex, offsetX, offsetY){
		var recordData = _records[dataIndex];
		if(recordData.isStreamWaiting) return;
		
		recordData.isStreamWaiting = true;
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+recordData.connkey+
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
					//console.log('event stream_mjpeg zoomin failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event stream_mjpeg zoomin error textStatus:' + textStatus);
			},
			complete: function(){
				recordData.isStreamWaiting = false;
			}
		});
	}
	
	
	
	//停止所有监视器的状态轮询请求
	function stopGetStatus(){
		_forceStopStatusTimer = true;
		
		var $monitorThumb = $('.monitor-thumb-record');
		if($monitorThumb){
			var index = $monitorThumb.data('ref');
			if(_records[index]){
				clearTimeout(_records[index].lastGetStatusTimer);
				_records[index].lastGetStatusTimer = null;
				
				//console.log('stopGetStatus index:'+index+' connkey:'+_records[index].connkey);
			}
		}
	}
	//开始所有监视器的状态轮询请求
	function startGetStatus(){
		_startGetStatusTimer = setTimeout(function(){
			_forceStopStatusTimer = false;
			
			doGetStatusMjpeg(_recordIndex);
			
		},REFRESH_INTERVAL);
	}
	// get_status'流静帧'（command=99）
	// /zm/index.php?view=request&request=stream&connkey=153831&token=f0a3a89dbc50b6bb5d709c231117f036&command=99
	function doGetStatusMjpeg(dataIndex){
		var recordData = _records[dataIndex];
		
		//console.log('command-99 connkey:'+recordData.connkey);
		
		//记录请求发起事件
		recordData.lastGetStatusStartTime = new Date().getTime();
		var reqUrl = window.zm.streamUrl+'?view=request&request=stream'+
											'&connkey='+recordData.connkey+
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
					//console.log('event stream_mjpeg get_status failed');
				}	
			},
			error: function(XMLHttpRequest, textStatus, errorThrown){
				//console.log('event stream_mjpeg get_status error textStatus:' + textStatus);
			},
			complete: function(){
				var endTime = new Date().getTime();
				var timeout = endTime - recordData.lastGetStatusStartTime;
				if(timeout > REFRESH_INTERVAL){
					if(!_forceStopStatusTimer){
						doGetStatusMjpeg(dataIndex);
					}
				}else{
					recordData.lastGetStatusTimer = setTimeout(function(){
						if(!_forceStopStatusTimer){
							doGetStatusMjpeg(dataIndex);
						}
					},REFRESH_INTERVAL-timeout);
				}
			}
		});
	}
	
	//{ "type":3,"event":4,"duration":33.25,"progress":33.25,"rate":1,"zoom":1,"paused":1}
	function updateMonitorStatus(dataIndex,statusData){
		//更新回放时长
		var recordData = _records[dataIndex];
		if(Number(statusData.duration)>0){
			recordData.Length = statusData.duration;
			
			var thumbWidth = $('#progress_bar_'+dataIndex).width() * statusData.progress/statusData.duration;
			$('#progress_thumb_'+dataIndex).css('width',thumbWidth);
		}
		
		
		var str = '';
		str += myUNAS._('模式：')+getModeStr(statusData.paused)+'　|　';
		str += myUNAS._('进度：')+getProgress(statusData.progress)+myUNAS._('秒')+'　|　';
		str += myUNAS._('缩放：')+statusData.zoom+'X';
		
		$('#cp_status_record_'+dataIndex).html(str);
			
		//重置所有底部流操作按钮状态
		$('#zm_btn_media_pause_record_'+dataIndex).removeClass('active, inactive');
		$('#zm_btn_media_play_record_'+dataIndex).removeClass('active, inactive');
		$('#zm_btn_media_zoomout_record_'+dataIndex).removeClass('active, inactive');
		
		//如果没有缩放
		if(Number(statusData.zoom) == 1){
			$('#zm_btn_media_zoomout_record_'+dataIndex).addClass('inactive');
		}
		//如果处于暂停状态
		if(statusData.paused){
			$('#zm_btn_media_pause_record_'+dataIndex).addClass('inactive');
		}else{
			$('#zm_btn_media_play_record_'+dataIndex).addClass('inactive');
		}
	}
	
	function getProgress(progress){
		var num = Number(progress);
		return parseInt(num*100)/100;
	}
	
	function getModeStr(paused){
		var intPaused = parseInt(paused);
		var str = '';
		switch(intPaused){
			case 1:
				str = myUNAS._('暂停');
				break;
			case 0:
				str = myUNAS._('回放');
				break;
		}
		return str;
	}
	
	
	//格式化日志时间的显示
	function formatDate(timestamp, widthHMS){
	  var date = new Date(timestamp);
	  var arr = [];
	  arr.push(date.getFullYear());
	  arr.push(stuffZero((date.getMonth()+1),2));
	  arr.push(stuffZero(date.getDate(),2));
	  var arr2 = [];
	  arr2.push(stuffZero(date.getHours(),2));
	  arr2.push(stuffZero(date.getMinutes(),2));
	
	  if(widthHMS){
	  	return arr.join('-')+' '+arr2.join(':');
	  }else{
	  	return arr.join('-');
	  }
	}
	//数字前置补零
	function stuffZero(num, length){
	  var str = '';
	  num = String(num);
	  length = length || 2;
	  for(var i = num.length; i < length; i++){
	    str += '0';
	  }
	  return num < Math.pow(10, length) ? str + (num|0) : num;
	};

	
	function showWaiting(){
		$('#loading_event').show();
	}
	
	function hideWaiting(){
		$('#loading_event').hide();
	}

	//token过期并重新获取后,且当前选项卡处于配置页面时调用，一般用于刷新数据
    function update(){
    	//console.log("updateEvent");
    	doGetRecordList(true);
    }
	
	window.zm = window.zm || {};
	
	window.zm.init = window.zm.init || [];
	window.zm.init['event'] = init;
	window.zm.destroy = window.zm.destroy || [];
	window.zm.destroy['event'] = destroy;
	window.zm.update = window.zm.update || [];
	window.zm.update['event'] = update;
})();

function addUniqueRecordConnkey(arr){
	for(var i=0,len=arr.length; i<len; ++i){
		//arr[i].connkey = window.zm.access_token+'-'+arr[i].Id;
		//arr[i].connkey = '123456-'+arr[i].Id;
		arr[i].connkey = parseInt(Math.random()*1000000);
		arr[i].scale = 60; //默认60%的显示质量
	}
}

function generateTestEvents(num){
	var arr = [];
	var obj;
	for(var i=1; i<=num; ++i){
		obj = {};
		obj.AlarmFrames = "0";                        //报警帧
        obj.Archived = "0";
        obj.AvgScore = "0";                           //平均分数
        obj.Cause = "Continuous";                     //原因
        obj.DefaultVideo = "3-video.mp4";          
        obj.DiskSpace = "178206263";
        obj.Emailed = "0";
        obj.EndTime = "2021-07-20 14:14:05";          //结束时间
        obj.Executed = "0";
        obj.FileSystemPath = "/var/cache/zoneminder/events/1/2021-07-20/3";
        obj.Frames = "815";                           //帧
        obj.Height = "1080";
        obj.Id = "3";                              //事件ID
        obj.Length = "34.82";                         //持续时长
        obj.Locked = false;
        obj.MaxScore = "0";                           //最大分数
        obj.MaxScoreFrameId = "130";
        obj.Messaged = "0";
        obj.MonitorId = "1";                          //监视器ID
        obj.Name = "Event- 3";                     //名称
        obj.Notes = "";
        obj.Orientation = "ROTATE_0";
        obj.SaveJPEGs = "3";                          //保存为JPEGs
        obj.Scheme = "Medium";
        obj.SecondaryStorageId = "0";
        obj.StartTime = "2021-07-20 14:13:31";        //开始时间
        obj.StateId = "1";
        obj.StorageId = "0";
        obj.TotScore = "0";                           //总分数
        obj.Uploaded = "0";
        obj.Videoed = "1";                            //保存为视频
        obj.Width = "1920";

        //以下是前端维护的属性
        obj.connkey = '';               //a random number which uniquely identifies a stream generated by ZM   
                                    	//can use connkey to “control” the stream (pause/resume etc.) 
        obj.scale = 60;					//监视器显示质量  
        obj.isStreamWaiting = false;	//是否正在进行视频流操作
        obj.lastGetStatusStartTime = 0;	//上一次发出getStatus请求时的时间戳（单位：毫秒）
        obj.lastGetStatusTimer = null;	//上一次发出getStatus请求的timer（用于后续调用clearTimeout）
		
		arr.push(obj);								
	}
	
	return arr;
}








