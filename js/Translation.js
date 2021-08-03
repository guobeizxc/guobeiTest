var myUNAS;

(function(){
	myUNAS=myUNAS||{};

	//myUNAS属性
	myUNAS.CurrentLanguage="简体中文";
	myUNAS.TranslationTable = {};
	myUNAS.LoadedTranslationFiles=[];
	myUNAS.SupportedLanguages=["English", "简体中文"];
	myUNAS.Event = {
	    _listeners: {},
	    //Add event hangler
	    addEvent: function (type, fn) {
	        if (typeof this._listeners[type] === "undefined") {
	            this._listeners[type] = [];
	        }
	        if (typeof fn === "function") {
	            //insert a listener only it is not in the array.
	            if (this._listeners[type].indexOf(fn) > -1) {
	            }
	            else {
	                this._listeners[type].push(fn);
	            }
	        }
	        return this;
	    },
	    //Trigger
	    fireEvent: function (type) {
	        var arrayEvent = this._listeners[type];
	        if (arrayEvent instanceof Array) {
	            for (var i = 0, length = arrayEvent.length; i < length; i += 1) {
	                if (typeof arrayEvent[i] !== 'undefined' && typeof arrayEvent[i] === "function") {
	                    try {
	                        arrayEvent[i]({ type: type });
	                    } catch (e) {
	                        //event call not successful
	                    }
	                }
	            }
	        }
	        return this;
	    },
	    //Remove Event Handler
	    removeEvent: function (type, fn) {
	        var arrayEvent = this._listeners[type];
	        if (typeof type === "string" && arrayEvent instanceof Array) {
	            if (typeof fn === "function") {
	                //remove, based on type and function
	                for (var i = 0, length = arrayEvent.length; i < length; i += 1) {
	                    if (arrayEvent[i] === fn) {
	                        this._listeners[type].splice(i, 1);
	                        break;
	                    }
	                }
	            } else {
	                // remove all functions associated with the type.
	                delete this._listeners[type];
	            }
	        }
	        return this;
	    }
	};


	/***********************************************************************
									函数
	***********************************************************************
	*/
	myUNAS.TextNodesUnder = function (node) {
	    var all = [];
	    for (node = node.firstChild; node; node = node.nextSibling) {
	        if (node.nodeType == 3) 
	        	all.push(node);
	        else 
	        	all = all.concat(myUNAS.TextNodesUnder(node));
	    }
	    return all;
	};

	myUNAS.CreateNodesTranslators = function (rootnode) {
	    //first get all textnodes
	    var translators = [];
	    var textnodes = myUNAS.TextNodesUnder(rootnode);
	    for (var i = 0; i < textnodes.length; i++) {
	        if (textnodes[i].nodeValue && textnodes[i].nodeValue.length > 0) {
	            var nodeTranslator = {};
	            nodeTranslator.node = textnodes[i];  //keep a track of node, reference of textnodes
	            nodeTranslator.originalText = textnodes[i].nodeValue; //keep a copy of orginal text, maybe not needed.
	            nodeTranslator.nodeType = textnodes[i].nodeType; //textnode..
	            nodeTranslator.translateProperty = 'nodeValue';
	            translators.push(nodeTranslator);
	        }
	    }
	    //then handle all tags (textnode is not a tag)
	    var tags = rootnode.getElementsByTagName('*');
	    for (var i = 0; i < tags.length; i++) {
	        if (tags[i].title && tags[i].title.length > 0) {
	            var tagTranslator = {};
	            tagTranslator.node = tags[i];  //keep a track of node, reference of textnodes
	            tagTranslator.originalText = tags[i].title; //keep a copy of orginal text, maybe not needed.
	            tagTranslator.nodeType = tags[i].nodeType; //record node type
	            tagTranslator.translateProperty = 'title';
	            translators.push(tagTranslator);
	        }
	    }
	    //inputs
	    var inputs = rootnode.getElementsByTagName("input"); //get all inputs under rootnode
	    for (var i = 0; i < inputs.length; i++) {
	        var tagTranslator = {};
	        tagTranslator.node = inputs[i];  //keep a track of node, reference of textnodes
			if((inputs[i].type == "button") || (inputs[i].type == "submit"))
				tagTranslator.originalText = inputs[i].value; //keep a copy of orginal text, maybe not needed.
	        tagTranslator.nodeType = inputs[i].nodeType; //record node type..
	        if((inputs[i].type == "button") || (inputs[i].type == "submit"))
				tagTranslator.translateProperty = 'value';
	        translators.push(tagTranslator);
	    }
	    //options
	    //select tags may contain options. could have more than one select tags. actually just find all <option> nodes 
	    var options = rootnode.getElementsByTagName("option"); //get all options under rootnode
	    for (var i = 0; i < options.length; i++) {
	        var tagTranslator = {};
	        tagTranslator.node = options[i];  //keep a track of node, reference of textnodes
	        tagTranslator.originalText = options[i].text; //keep a copy of orginal text, maybe not needed.
	        tagTranslator.nodeType = options[i].nodeType; //record node type..
	        tagTranslator.translateProperty = 'text';
	        translators.push(tagTranslator);
	    }
	    //<a> href
	    //select tags may contain <a> tags.
	    var ATags = rootnode.getElementsByTagName("a"); //get all options under rootnode
	    for (var i = 0; i < ATags.length; i++) {
	        var tagTranslator = {};
	        tagTranslator.node = ATags[i];  //keep a track of node, reference of textnodes
	        if( ATags[i].href == null || ATags[i].href.length == 0){
			
	        }else{
				tagTranslator.originalText = ATags[i].href; //keep a copy of orginal href
				tagTranslator.translateProperty = 'href';
			}
			tagTranslator.nodeType = ATags[i].nodeType; //record node type..
	        translators.push(tagTranslator);
	    };
	    //<img> src
	    //select imgs may contain <a> tags.
	    var imgs = rootnode.getElementsByTagName("img"); //get all options under rootnode
	    for (var i = 0; i < imgs.length; i++) {
	        var tagTranslator = {};
	        tagTranslator.node = imgs[i];  //keep a track of node, reference of textnodes
	        tagTranslator.originalText = imgs[i].src; //keep a copy of orginal href
	        tagTranslator.nodeType = imgs[i].nodeType; //record node type..
	        tagTranslator.translateProperty = 'src';
	        translators.push(tagTranslator);
	    };
	    return translators;
	};

	myUNAS._=function(str, lang){
		var lead = '##$@'; //lead mark
	    var end = '@$##'; //end mark
	    var L = end.length;
	    if (typeof (str) === 'undefined') return ""; //
	    lang = lang || myUNAS.CurrentLanguage;
	    //just find all the sub strings need to be translated.
	    var ss = str;
	    var subStr = '';
	    var lPos = ss.indexOf(lead);
	    var ePos = 0;
	    var count = 0;
	    var stringLength = ss.length;

	    if (lPos > -1) {
	        do {
	            var Marker = '';
	            var Marker2 = '';
	            var id = '';
	            subStr = '';
	            if (lPos > -1) {
	                //found lead mark
	                ePos = ss.indexOf(end); //find end mark, MUST Have. 
	                if (ePos > -1) {
	                    subStr = ss.substring(lPos, ePos + L);
	                    Marker = ss.substring(lPos, ePos + L);
	                    id = subStr.replace(lead, ''); //remove lead mar
	                    id = id.replace(end, '');//remove end mark and now id is retrieved
	                    id = id.trim(); //remove whitespaces from both ends
	                    var tmpStr = ss.substring(ePos + L, ss.length); //the rest of the string                    
	                    var A = tmpStr.indexOf(lead);
	                    var B = tmpStr.indexOf(end); //find the closing part .
	                    if (B > -1) {
	                        Marker2 = tmpStr.substring(A, B + L); //end mark
	                        subStr = subStr + tmpStr.substring(0, B + L); //found subStr to translate
	                    }
	                    else {
	                        //no close mark, to end 
	                        subStr = subStr + tmpStr; //found subStr to translate
	                    }
	                }
	                else {
	                    break; //something is wrong, don't translate.
	                }
	            }
	            var text = subStr.replace(Marker, '');//remove 'lead+id+end',from both ends; this is the real text need to be translated.
	            text = text.replace(Marker2, ''); //remove end..
	            if (id.length == 0) {
	                id = '0';//default if no id is specifed.
	            }
	            var stest = JSON.stringify(text + lang + id);//test only, remove it after testing
	            var tmp2 = myUNAS.TranslationTable[JSON.stringify(text + lang + id)]; //translate to lang.
	            if (tmp2) { //found translation
	                ss = ss.replace(subStr, tmp2); //translate the orignial text 
	            }
	            else {
	                ss = ss.replace(subStr, text); //remove the mark, use original text (substring)
	            }
	            lPos = ss.indexOf(lead);
	            count++;
	        } while (lPos > -1 && count <= stringLength);
	    }
	    else {
	        //no mark, translate the whole text
	        var tmp3 = myUNAS.TranslationTable[JSON.stringify(ss + lang + '0')];
	        if (tmp3) ss = tmp3;
	    }
	    return ss;
	};
	
	/*
		加载远程的翻译文件并解析，解析结果保存到myUNAS.TranslationTable对象中

	 */
	myUNAS.LoadTranslation=function(f,callback){
		if(!Array.indexOf){
			Array.prototype.indexOf = function(obj){
				for(var i=0; i<this.length; i++){
					if(this[i]==obj){
						return i;
					}
				}
				return -1;
			};
		}
	    if (typeof f === 'undefined' || myUNAS.LoadedTranslationFiles.indexOf(f) >= 0) return; //return if no file or exists
	    //Use Ajax to load the file
	    var xhr = (window.ActiveXObject) ? new ActiveXObject("Microsoft.XMLHTTP") : (XMLHttpRequest && new XMLHttpRequest()) || null;
	    if (xhr) {
	        xhr.open('GET', f, false); //must be synchronous....
	        xhr.onreadystatechange = function () {
	            if (xhr.readyState === 4) {
					if((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304){
						var langs = JSON.parse(xhr.responseText);
						var langCount = myUNAS.SupportedLanguages.length;
						if (langs != null && typeof langs.UNASTranslation != null) {
							for (var i = 0; i < langs.UNASTranslation.length; i++) { //array of several languages.
								if (myUNAS.SupportedLanguages.indexOf(langs.UNASTranslation[i].language) < 0) myUNAS.SupportedLanguages.push(langs.UNASTranslation[i].language); //added to supportedLanguages
								var tmp = langs.UNASTranslation[i].table;
								for (var j = 0; j < tmp.length; j++) {
									var EnglishText = JSON.stringify(tmp[j][0]).slice(1, -1); //original English Text
									var tid = JSON.stringify(tmp[j][1]).slice(1, -1); //text id
									var TranslatedText = JSON.stringify(tmp[j][2]).slice(1, -1);
									myUNAS.TranslationTable[JSON.stringify(EnglishText + langs.UNASTranslation[i].language + tid)] = TranslatedText;//use property rather than array to save the translations! [English -->Lang]
									myUNAS.TranslationTable[JSON.stringify(TranslatedText + 'English' + tid)] = EnglishText;//use property rather than array to save the translations! [Tanslated -->English]
								}
							}
							myUNAS.LoadedTranslationFiles.push(f); //add this file into the loaded list to avoid duplicated loading.
							if (langCount != myUNAS.SupportedLanguages.length) {
							    myUNAS.Event.fireEvent('SupportedLanguagesChange'); //fire 'SupportedLanguagesChange' event to notify
							}
							if (callback && typeof callback === "function") {
							    callback();
							}
						}
					}else{
						console.log('Loading Translation file failed! xhr.status:'+xhr.status);
					}
	            }
	            else {
	                console.log('Loading Translation file failed! xhr.readyState:'+xhr.readyState);
	            }
	        };
	        xhr.send();
	    }
	};
	
	
	//加载翻译文件
	// myUNAS.LoadTranslation("./languages/Translation.json",function(){
		// $("body").show();
	// });

	

	//对外提供传入页面的翻译回调的函数
	window.addTranslationEvent=function(callback){
		if(callback && typeof callback==="function")
			myUNAS.Event.addEvent('ChangeLanguage', callback);
	};

	//暴漏给外部，在更改语言时执行该翻译函数，传入需要翻译的语言参数
	window.unasTranslation=function(language){
		// if(language!="简体中文" && language!="English"){
		// 	language = "English";
		// }
		if(language=="cn_zh"){
			language="简体中文";
		}
		else{
			language = "English";
		}

		myUNAS.CurrentLanguage=language;
		translateHtmlBody();

		//执行回调
		myUNAS.Event.fireEvent('ChangeLanguage');
	};
	
	//翻译全部文本节点
	function translateHtmlBody(){
		var pageTranslators = myUNAS.CreateNodesTranslators(document.getElementsByTagName('body')[0]);

		for (var i = 0; i < pageTranslators.length; i++) {
            var node = pageTranslators[i].node; // original node
            var p = pageTranslators[i].translateProperty; //the attribues need to be translated
            node[p] = myUNAS._(pageTranslators[i].originalText); //translate
        }
	}
})();