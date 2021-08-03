(function(){
	function init(){
		//console.log('init config');
		

		//为左侧选项卡的li元素注册点击事件
		$("#config-left-bar-ul li").on("click",function(){
			//给激活样式之前先移除
			$("#config-left-bar-ul li").removeClass("active");
			$(this).addClass("active");

			//显示对应选项卡的内容
			$(".config-right-content-body").children("div").addClass("hide");
			$("[ref='"+this.id+"']").removeClass("hide");
		});

		//设置滚动条
		$(".config-li-table-content-scroll").mCustomScrollbar({
			autoHideScrollbar:false,
		  	theme:"minimal-dark"
		});

		//配置保存功能,仅保存被修改过的值，根据配置初始化时通过data方法绑定originValue的值来区分哪些值被修改过
		$("#config-save-btn").on("click",function(){
			var modifiedConfigData={};
	
			$(".config-right-content-body input[type=text],.config-right-content-body input[type=number],.config-right-content-body input[type=radio]:checked,.config-right-content-body text,.config-right-content-body select").each(function(){
				var originValue=!$(this).data("originValue")?"":$(this).data("originValue");

				if(originValue!=this.value){
					modifiedConfigData[this.name]=this.value;
				}
			});
			
			//复选框处理
			$(".config-right-content-body input[type=checkbox]").each(function(){
				var originValue=!!$(this).data("originValue");
				if($(this).prop("checked")!=originValue){
					modifiedConfigData[this.id]=$(this).prop("checked")*1;
				}
			});

			//skin，css，apiUids[]这3项先移除
			//delete modifiedConfigData.skin
			//delete modifiedConfigData.css
			delete modifiedConfigData["apiUids[]"];
			//console.log(modifiedConfigData);

			var keyNum=Object.keys(modifiedConfigData).length;
			var count=0;				//对修改完成数量进行计数，每完成一次ajax请求则count++,所有配置项均保存成功后出现提示信息
			
			for(var item in modifiedConfigData){
				var _data={ "Config[Value]":modifiedConfigData[item] };
				//console.log(_data);
				$.ajax({
					url: "/zm/api/configs/edit/"+item+".json?token="+window.zm.access_token,
					type: "PUT",
					dataType: "text",
					async: true,
					data: _data,
					success: function(data){
						//console.log(data);
						//保存成功后更新其对应的data数据
						$("[name='"+item+"']").data("originValue",_data["Config[Value]"]);

						count++;
						if(count==keyNum){
							promptShow("保存成功",function(){
								//若修改了语言这一配置项，完成修改后需要执行翻译
								if(modifiedConfigData.ZM_LANG_DEFAULT){
									window.unasTranslation(modifiedConfigData.ZM_LANG_DEFAULT);
									//修改url的language参数值,但不能刷新页面
									if(modifiedConfigData.ZM_LANG_DEFAULT=="cn_zh"){
										history.replaceState({},"",window.location.href.replace("language=en","language=cn"));
									}
									else if(modifiedConfigData.ZM_LANG_DEFAULT=="en_us"){
										history.replaceState({},"",window.location.href.replace("language=cn","language=en"));
									}
								}
							});
						}
					},
					error:function(xhr, ajaxOptions, thrownError){
						//console.log(xhr);
						//console.log(ajaxOptions);
						//console.log(thrownError);
					}
				});
			}
		});


		//初始化配置值
		initConfig();

		//执行翻译
		window.unasTranslation(myUNAS.CurrentLanguage);
	}

	function initConfig(){
		var _data={};
		$.ajax({
			url: "/zm/api/configs.json?token="+window.zm.access_token,
			type: "GET",
			dataType: "json",
			async: true,
			data: _data,
			success: function(data){
				if(data && data.configs){
					$.each(data.configs,function(){
						//console.log($("[name='"+this.Config.Name+"']"));
						//console.log(this.Config);
						var _data=$("[name='"+this.Config.Name+"']");
						if(_data.length==0){
							return;
						}
	
	
						//文本框text，数字框number，下拉框select,textarea框赋值
						//同时为其绑定一个同value的data属性，用于确认值是否被用户修改
						if(_data.attr("type")=="text" 
							|| _data.attr("type")=="number" 
							|| _data[0].tagName=="SELECT" 
							|| _data[0].tagName=="TEXTAREA"){
							if(this.Config.Value!=""){
								_data.val(this.Config.Value);
								_data.data("originValue",this.Config.Value);
							}
							else{
								_data.val(this.Config.DefaultValue);
								_data.data("originValue",this.Config.DefaultValue);
							}
						}
						//复选框赋值(由于配置项复选框都只有一个，所以可以这么写)
						if(_data.attr("type")=="checkbox"){
							if(this.Config.Value=="1"){
								_data.prop("checked",true);
								_data.data("originValue",true);
							}
							else{
								_data.prop("checked",false);
								_data.data("originValue",false);
							}
						}
						//单选框赋值
						if(_data.attr("type")=="radio"){
							if(this.Config.Value!=""){
								$("#"+this.Config.Name+"_"+this.Config.Value).prop("checked",true);
								$("[name='"+this.Config.Name+"']").data("originValue",this.Config.Value);
							}
							else{
								$("#"+this.Config.Name+"_"+this.Config.DefaultValue).prop("checked",true);
								$("[name='"+this.Config.Name+"']").data("originValue",this.Config.DefaultValue);
							}
						}
					});
				}else{
					promptShow('获取配置数据失败');
				}
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log(xhr);
			}
		});
	}
	//配置页面卸载
    function destroy(){
    	//console.log("config destroy");
    	$("#main_container").children().remove();
    }
    //token过期并重新获取后,且当前选项卡处于配置页面时调用，一般用于刷新数据
    function update(){
    	initConfig();
    }

    
    
    //设置某个配置项的值
    function setConfigItem(item, value, callback){
		$.ajax({
			url: "/zm/api/configs/edit/"+item+".json?token="+window.zm.access_token,
			type: "PUT",
			dataType: "text",
			async: true,
			data: { "Config[Value]":value },
			success: function(data){
				if(callback && typeof callback=="function"){
					callback();
				}
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log('config edit error ajaxOptions:' + ajaxOptions);
			}
		});
    }
    //设置配置中的语言信息
    function setConfigLanguage(language){
    	setConfigItem('ZM_LANG_DEFAULT', language, null);
    }
    //获取配置中的语言信息
    function getConfigLanguage(){
    	if(window.zm.configs){
    		var configs = window.zm.configs;
    		$.each(configs,function(){
				//console.log('config name:'+this.Config.Name);
				//console.log('config value:'+this.Config.value);
				if(this.Config.Name == 'ZM_LANG_DEFAULT'){
					return this.Config.Value;
				}
			});
    	}
    	return 'English';
    }
    
    function getConfig(){
		$.ajax({
			url: "/zm/api/configs.json?token="+getCookie("access_token"),
			type: "GET",
			dataType: "json",
			async: true,
			success: function(data){
				if(data && data.configs){
					window.zm.configs = data.configs;
				}
			},
			error:function(xhr, ajaxOptions, thrownError){
				//console.log('config getall error ajaxOptions:' + ajaxOptions);
			}
		});
    }
    getConfig();

	window.zm = window.zm || {};
	window.zm.init = window.zm.init || [];
	window.zm.init['config'] = init;
	window.zm.destroy = window.zm.destroy || [];
	window.zm.destroy['config'] = destroy;
	window.zm.update = window.zm.update || [];
	window.zm.update["config"]=update;

	window.zm.setConfigItem=setConfigItem;
	window.zm.setConfigLanguage=setConfigLanguage;
	window.zm.getConfigLanguage=getConfigLanguage;
})();



