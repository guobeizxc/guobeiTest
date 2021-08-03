(function(){
	

	var PAGE_SIZE=10;		//每页显示的数量


	function init(){
		//console.log('init log');
		
		//获取日志列表
		//console.log(getLogData(1));

		//获取监视器列表
		//getMointers();
		getMonitorList(function(data){
			var str="";
			for(var i=0;i<data.length;i++){
				str+="<option value='"+data[i].Monitor.Id+"'>"+data[i].Monitor.Name+"</option>";
			}
			$("#log-mointer-select").append(str);
			//$("#popup_log").hide();
		});


		//渲染时间控件
		laydate.render({
		  	elem: '#log-search-date-input', //指定元素
		  	showBottom: false,
			value:currentDate(),
			done:function(){
				$("#log-refreshBtn").trigger("click");
			}
		});

		//显示分页控件,并填充初始数据
		initTableAllPagination(1);

		//设置滚动条
		$("#log-content-body").mCustomScrollbar({
			autoHideScrollbar:false,
		  	theme:"minimal-dark"
		});

		//注册清除按钮事件
		$("#log-clearBtn").on("click",function(){
			clearData();
			//console.log("log-clearBtn")
		})
		//注册刷新按钮事件
		$("#log-refreshBtn").on("click",function(){
			//$("#log-footer-pagination").pagination(1);
			initTableAllPagination(1);
		})
		//注册错误级别change事件，自动调用刷新按钮事件
		$("#log-error-level-select").on("change",function(){
			$("#log-refreshBtn").trigger("click");
		})


		//执行翻译
		window.unasTranslation(myUNAS.CurrentLanguage);
	}
	
	/* 
		用于获取日志数据，page为当前页
		callback为请求完成后的回调函数，接受一个参数，该参数为返回的日志结果
	*/
	function getLogData(page,callback){
		var _data = {
			page:page,
			limit:PAGE_SIZE,
			date:$("#log-search-date-input").val(),
			order:"desc",
			code:$("#log-error-level-select").val()
		};
		//console.log(_data);
		$.ajax({
			url: "/zm/api/logs.json?token="+window.zm.access_token,
			type: "GET",
			dataType: "json",
			async: true,
			data: _data,
			timeout: 30000,
			beforeSend:function(){
				//console.log(_data);
				//显示请求遮罩层
				$("#popup_log").show();
			},
			complete:function(){
				$("#popup_log").hide();
			},
			success: function(data){
				//console.log(JSON.stringify(data));
				if(typeof callback=="function"){
					callback(data);
				}
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log(xhr);
				//console.log(ajaxOptions);
				//console.log(thrownError);
				return;
			}	
		});
	}

	function initTableAllPagination(totalNumber){
		//填充数据
		getLogData(totalNumber,function(data){
			//console.log(data);
			paddingData(data.logs);

			//定义一个初始化页数的数组
			var pageInitArr=[];
			for(i=0;i<data.pagination.pageCount;i++){
				pageInitArr.push(i);
			}
			$('.log-footer-pagination').pagination({
				className: 'paginationjs-small',
				dataSource: pageInitArr,			//数组，用于初始化页数
				pageSize: PAGE_SIZE, 				//每页显示的条数
				triggerPagingOnInit: false,
				callback: function(data, pagination) {
					getLogData(pagination.pageNumber,function(data){
						paddingData(data.logs);
					});
				}
			});
		});
		
		
    }
    //填充数据
    function paddingData(data){
    	//console.log(data[0].Log);
    	//填充数据之前清空table的tr标签
		$("#log-content-body-table tr").remove();

		var str="";
		for(var i=0;i<data.length;i++){
			str+="<tr>";
			str+="<td width='3%'></td>";
			str+="<td width='150px'>"+formatDate(data[i].Log.TimeKey*1000)+"</td>";
			str+="<td width='100px'>"+data[i].Log.Id+"</td>";
			str+="<td width='100px'>"+data[i].Log.Code+"</td>";
			str+="<td>"+data[i].Log.Message+"</td>";
			str+="<td width='100px'>"+data[i].Log.Component+"</td>";
			str+="<td width='15%'>"+data[i].Log.File+"</td>";
			str+="</tr>";
		}
		$("#log-content-body-table").append(str);
    }
    //清除数据
    function clearData(){
    	var _data = {};
    	$.ajax({
			url: "/zm/api/logs.json?delete=delete&token="+window.zm.access_token,
			type: "GET",
			dataType: "json",
			async: true,
			data: _data,
			timeout: 5000,
			beforeSend:function(){
				//console.log(_data);
				//显示请求遮罩层
				$("#popup_log").show();
			},
			complete:function(){
				$("#popup_log").hide();
			},
			success: function(data){
				//console.log(JSON.stringify(data));
				promptShow("删除成功",function(){
					$("#log-refreshBtn").trigger("click");
				});
			},
			error:function(xhr, ajaxOptions, thrownError){
				if(thrownError=="timeout"){
					promptShow("删除请求已发出，请耐心等待");
				}
			}	
		});
    }
    //获取监视器列表
    function getMointers(){
    	var _data = JSON.stringify({ 
									cmd:"monitor_list",
									params:{
										auth:window.zm.auth
									}
								});
    	$.ajax({
			url: window.zm.reqUrl,
			type: "POST",
			dataType: "json",
			async: false,
			data: _data,
			timeout: 30000,
			beforeSend:function(){
				//console.log(_data);
				//显示日志遮罩
				$("#popup_log").show();
			},
			success: function(data){

				$("#popup_log").hide();
			},
			error:function(xhr, ajaxOptions, thrownError){
				//测试代码，正式使用时除data,其他copy到success中
				var data={
					"results": {
						"monitors": [
							{
								"Monitor" : {

								},
								"Monitor_Status" : {
				                    AnalysisFPS: "0.00",
				                    CaptureBandwidth: "499904",
				                    CaptureFPS: "25.00",
				                    MonitorId: "1",
				                    Status: "Connected"
				                }
							},
							{
								"Monitor" : {

								},
								"Monitor_Status" : {
				                    AnalysisFPS: "0.00",
				                    CaptureBandwidth: "499904",
				                    CaptureFPS: "25.00",
				                    MonitorId: "2",
				                    Status: "Connected"
				                }
							},
							{
								"Monitor" : {

								},
								"Monitor_Status" : {
				                    AnalysisFPS: "0.00",
				                    CaptureBandwidth: "499904",
				                    CaptureFPS: "25.00",
				                    MonitorId: "3",
				                    Status: "Connected"
				                }
							}
						]
					}
				}
				var str="";

				var temp=data.results.monitors;
				for(var i=0;i<temp.length;i++){
					str+="<option value='"+temp[i]["Monitor_Status"].MonitorId+"'>Mointer"+temp[i]["Monitor_Status"].MonitorId+"</option>";
				}
				$("#log-mointer-select").append(str);
				$("#popup_log").hide();
			}	
		});
    }

    //日志页面卸载
    function destroy(){
    	//console.log("log destroy");
    	$("#main_container").children().remove();
    }

    //token过期并重新获取后,且当前选项卡处于日志页面时调用，一般用于刷新数据
    function update(){
    	$("#log-refreshBtn").trigger("click");
    }
	
	window.zm = window.zm || {};
	window.zm.init = window.zm.init || [];
	window.zm.init['log'] = init;
	window.zm.destroy = window.zm.destroy || [];
	window.zm.destroy['log'] = destroy;
	window.zm.update = window.zm.update || [];
	window.zm.update["log"]=update;
})();

