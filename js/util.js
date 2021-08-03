/*
	设置或修改cookie
	参数说明
		name：cookie的名称
		value：cookie的值
		expire：生效时间,以秒为单位，若不设置则在浏览器关闭后失效
 */
function setCookie(name,value,expire){
	var str=name+"="+escape(value);
	if(expire && Number(expire)){
		var date=new Date();
		date.setTime(date.getTime()+expire*1000);
		str=str+";expires="+date.toGMTString();
	}
	document.cookie=str;
}



/*
	获取cookie
	参数说明
		name：需要获取的cookie名称
 */
function getCookie(name) {
    var arr = document.cookie.match(new RegExp("(^| )" + name + "=([^;]*)(;|$)"));
    if (arr != null) return unescape(arr[2]); return "";
}


/*
	获取url的参数

 */
function getParameterURL(str){
    var parameterURL = location.search.substring(1, location.search.length);
    var paramArr = parameterURL.split("&");
    var key,value,temp;
    var paramobj = {};

    for (i = 0; i < paramArr.length; i++) {
        temp = paramArr[i].split("=");
        if (temp.length === 1) {
            paramobj[temp[0]] = "";
        }
        else if(temp.length>1){
            for (j = 0; j < temp.length; j++) {
                paramobj[temp[0]] = decodeURIComponent(temp[1]);
            }
        }
    }
    
    //如果参数名不存在,函数会返回undefined,尽量不要让函数返回undefined,让其返回空字符串
    return paramobj[str]==undefined?"":paramobj[str];
}

/*时间戳转日期格式 yyyy-MM-dd HH:mm:ss*/
function formatDate(date) {
	var date = new Date(date*1);
	var YY = date.getFullYear() + '-';
	var MM = (date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : date.getMonth() + 1) + '-';
	var DD = (date.getDate() < 10 ? '0' + (date.getDate()) : date.getDate());
	var hh = (date.getHours() < 10 ? '0' + date.getHours() : date.getHours()) + ':';
	var mm = (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes()) + ':';
	var ss = (date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds());
	return YY + MM + DD +" "+hh + mm + ss;
}

/*获取当前时间*/
function currentDate() {
	var d = new Date();
	var month=d.getMonth()+1;
	if(month<10){
		month="0"+month;
	}
	var day=d.getDate();
	if(day<10){
		day="0"+day;
	}
	str = '';

	str += d.getFullYear() + '-'; //获取当前年份 
	str += month + '-'; //获取当前月份（0——11） 
	str += day ;
	return str;
}

/*
	不足位补特定字符，可选择前导补位或后导补位
	参数说明：
		model:字符串，可选的模式，支持2种，如果不是这两种则直接返回原字符串
			pre前导补位
			after后导补位
		str:需要被补位的字符串
		maxLength:字符的最大长度，包括str的长度，如果传入的length小于str的长度直接返回原字符串,否则不足位补特定字符，直到补到length指定的长度
		compStr:补位的字符
	例：
		complement("pre","test",6,"0")
	返回结果：
		00test
	例：
		complement("after","test",6,"00")
	返回结果：
		test0000
 */
function complement(model,str,maxLength,compStr){
	str=str+"";
	if(str.length>=maxLength){
		return str;
	}

	var diffLength=maxLength-str.length;

	for(var i=0;i<diffLength;i++){
		if(model=="pre"){
			str=compStr+str;
		}
		else if(model=="after"){
			str=str+compStr;
		}
	}
	
	return str;
}

/*阻止事件冒泡*/
function stopPropagation(e){
	e = e || window.event;

	if(e.stopPropagation) { //W3C阻止冒泡方法
		e.stopPropagation();
	} else {
		e.cancelBubble = true; //IE阻止冒泡方法
	}
}