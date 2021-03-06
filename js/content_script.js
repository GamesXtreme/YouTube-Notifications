var awaitingResponse = [];

/**
 *  Gets the string from the locales
 *
 *  @param {string} name A valid localized string which doesn't include 'settingsJs'
 *  @returns {string} The localized string
 */
function getString(name) {
    return chrome.i18n.getMessage("contentScript_" + name);
}

$(function(){
    chrome.runtime.sendMessage({type: "showAddButton"}, function(response){
        if(response){
            if(!(document.querySelector("ytd-app") !== null))
                launchLegacy();
            else
                launch();
            setInterval(function(){
                if(!(document.querySelector("ytd-app") !== null))
                    launchLegacy();
                else
                    launch();
            }, 1000);
        }
    });
    chrome.runtime.sendMessage({type: "watchNotificationButton"}, function(response){
        if(response){
            $(document).on("click", "ytd-toggle-button-renderer", function(){
                var status = $(this).find("button").attr("aria-pressed") === "true",
                    channelId = $(this).parents("ytd-subscribe-button-renderer").find("[data-channel-external-id]").attr("data-channel-external-id");

                if(typeof channelId === "undefined")
                    return console.error("YTN: Failed to retrieve channel ID");

                console.log(channelId);
                if(status)
                    chrome.runtime.sendMessage({type: "addYoutubeChannel", contentScript: true, name: channelId, refresh: true});
                else
                    chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true});
            });
        }
    });

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse){
        switch (request.type) {
            case "contentScript_response":
                onMessageResponse(request.responseType, request.id);
                break;
        }
    });

    //Legacy
    if(!(document.querySelector("ytd-app") !== null)){
        $(document).on("click", "#ytn-btn, .ytn-btn", function(){
            var elem = $(this),
                channelId = elem.attr("data-channelId");

            if(elem.hasClass("yt-uix-button-subscribe-branded")){// Add channel
                awaitingResponse.push({
                    id: channelId,
                    elem: elem
                });
                chrome.runtime.sendMessage({type: "addYoutubeChannel", contentScript: true, name: channelId, refresh: true});
            }else if(elem.hasClass("yt-uix-button-subscribed-branded")){// Remove channel
                awaitingResponse.push({
                    id: channelId,
                    elem: elem
                });
                chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true});
            }
        });
    }else{
        $(document).on("click", ".ytn-btn", function(){
            var elem = $(this),
                channelId = elem.attr("data-channelId");

            awaitingResponse.push({
                id: channelId,
                elem: elem
            });
            if(!elem.attr("subscribed")){// Add channel
                chrome.runtime.sendMessage({type: "addYoutubeChannel", contentScript: true, name: channelId, refresh: true});
            }else{// Remove channel
                chrome.runtime.sendMessage({type: "removeYoutube", num: 1, contentScript: true, name: channelId, refresh: true});
            }
        });
    }

});
function onMessageResponse(type, id){
    awaitingResponse.forEach(function(item, i) {
        if(item.id === id){
            if(document.querySelector("ytd-app") === null) {
                if (type)
                    item.elem.removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
                else
                    item.elem.addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
            }else{
                if (type) {
                    item.elem.find("span").text(getString("removeChannel").replace("YouTube Notifications", "YTN"));
                    item.elem.attr("subscribed", true);
                }else{
                    item.elem.find("span").text(getString("addChannel").replace("YouTube Notifications", "YTN"));
                    item.elem.removeAttr("subscribed");
                }
            }
            awaitingResponse.pop(i);
        }
    });
}

function launch(){
    var code = 'var subscribeButton = document.querySelectorAll("#subscribe-button");\
    subscribeButton.forEach(function(e){\
        if(e.querySelector(":scope > paper-button") !== null)\
            return;\
        e.style.display = "flex";\
        e.style.flexDirection = "row";\
        e.style.alignItems = "center";\
\
        var idElem = e.querySelector("[data-channel-external-id]");\
        if(!idElem) return;\
        var id = idElem.getAttribute("data-channel-external-id");\
\
        var paperButton = document.createElement("paper-button");\
        paperButton.classList = "ytn-btn ytd-subscribe-button-renderer";\
        paperButton.setAttribute("data-channelId", id);\
        paperButton.setAttribute("init", false);\
        paperButton.style.display = "none";\
\
        var span = document.createElement("span");\
        paperButton.appendChild(span);\
\
        Polymer.dom(e).appendChild(paperButton);\
    });';
    if(document.querySelector("[ytn-script]") !== null)
        document.querySelector("[ytn-script]").remove();

    var script = document.createElement("script");
    script.setAttribute("ytn-script", true);
    script.innerHTML = code;
    document.head.appendChild(script);

    document.querySelectorAll(".ytn-btn[init='false']").forEach(function (e) {
        var channelId = e.getAttribute("data-channelId");

        chrome.runtime.sendMessage({type: "doesYoutubeExist", id: channelId, index: -1}, function (response) {
            if (response.status){
                e.querySelector("span").innerHTML = getString("removeChannel").replace("YouTube Notifications", "YTN");
                e.setAttribute("subscribed", true);
            }else{
                e.querySelector("span").innerHTML = getString("addChannel").replace("YouTube Notifications", "YTN");
                e.removeAttribute("subscribed");
            }
            e.style.display = "flex";

            e.removeAttribute("init");
        });
    });
}

function launchLegacy(){
    var slashes = window.location.href.split("/");
    if(slashes.indexOf("user") < 0 && slashes.indexOf("channel") < 0 && slashes.indexOf("subscription_manager") < 0 && slashes.pop().split("?").shift() != "watch"){
        return;
    }
    
    var elem = '<button class="yt-uix-button yt-uix-button-size-default yt-uix-button-has-icon no-icon-markup hover-enabled ytn-btn" type="button" style="margin-left: 5px;float: initial;">\
            <span class="yt-uix-button-content">\
                <span class="subscribe-label" aria-label="' + getString("addChannel") + '">' + getString("addChannel") + '</span>\
                <span class="subscribed-label" aria-label="' + getString("channelAdded") + '">' + getString("channelAdded") + '</span>\
                <span class="unsubscribe-label" aria-label="' + getString("removeChannel") + '">' + getString("removeChannel") + '</span>\
            </span>\
        </button>';
    
    if(slashes.indexOf("subscription_manager") > -1 && $(".ytn-btn").length == 0){// If is on page: https://www.youtube.com/subscription_manager
        var elems = $(elem).insertBefore(".yt-uix-overlay");
        for(var i = 0; i < elems.length; i++){
            var channelId = $($(".yt-uix-overlay")[i]).parent().children(".yt-uix-button").attr("data-channel-external-id");
            $(elems[i]).attr("data-channelId", channelId);
            chrome.runtime.sendMessage({type: "doesYoutubeExist", id: channelId, index: i}, function(response){
                if(response.status)
                    $(elems[response.index]).removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
                else
                    $(elems[response.index]).addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
            });
        }
    }else if($(".ytn-btn").length < 1){// For everything else
        $(".yt-uix-overlay").each(function(){
            if(
                $(this).hasClass("channel-settings-overlay") ||
                $(this).hasClass("featured-content-picker-overlay") ||
                $(this).hasClass("settings-dialog-container") ||
                $(".about-metadata-container").find(this).length > 0 ||
                $(this).parent().hasClass("channel-header-flagging-menu-container"))
                return;
            else{
                if($(".primary-header-actions").find(this).length > 0){
                    var elem2 = elem.replace("float: initial", "float: right");
                    $(".primary-header-actions").prepend(elem2);
                }else
                    $(elem).insertBefore($(this));
            }
        });

        var channelId = $(".yt-uix-button.yt-uix-subscription-button").attr("data-channel-external-id");
        $(".ytn-btn").attr("data-channelId", channelId);
        chrome.runtime.sendMessage({type: "doesYoutubeExist", id: channelId}, function(response){
            if(response.status)
                $(".ytn-btn").removeClass("yt-uix-button-subscribe-branded").addClass("yt-uix-button-subscribed-branded");
            else
                $(".ytn-btn").addClass("yt-uix-button-subscribe-branded").removeClass("yt-uix-button-subscribed-branded");
        });
    }
}
