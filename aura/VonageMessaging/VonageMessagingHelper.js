({
    getData : function(component,event,helper){
        //call loadData server side method to get the MessagingHistory records
        console.log('getting MessagingHistory');
        var action = component.get("c.loadData");
        var ObjectId = component.get("v.recordId");
        var ObjectType = component.get("v.sObjectName");
        action.setParams({
            "ObjectType": ObjectType,
            "ObjectId": ObjectId,
        });
        action.setCallback(this,function(response){
            var state = response.getState();
            if(state == "SUCCESS"){
                console.log("Successfully returned Message History List");
                var MessagingHistoryList = response.getReturnValue();
                // get ConversationData and date
                var MessagingConversationData = component.get("v.MessagingConversationData");
                var today = new Date();
                var todayDate = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
                console.log("Dump Conversation DATA");
                //console.log(MessageConversationData);
                //
                //retrieve master object
                console.log("link object start");
                var CaseObj = component.get("v.LinkObject")
                console.log(JSON.stringify(CaseObj));   
                 console.log("link object stop");   
                for(var i=0; i < MessagingHistoryList.length;i++){
                    //To display description of MessagingHistory item as link
                    console.log("new message display");
                    MessagingHistoryList[i].linkToRecord = '/'+MessagingHistoryList[i].Id;
                    // prepare Display variables
                    console.log(MessagingHistoryList[i]);
                    MessagingHistoryList[i].displayDirection = helper.capitaliseFirstLetter(MessagingHistoryList[i].Direction__c);
                    MessagingHistoryList[i].displayChannel = helper.capitaliseFirstLetter(MessagingHistoryList[i].Channel__c);
                    //prettify DateTime
                    var recordDate=new Date(MessagingHistoryList[i].Date_Time__c);
                    var recordDateD = recordDate.getFullYear()+'-'+(recordDate.getMonth()+1)+'-'+recordDate.getDate();
                    if(recordDateD == todayDate){
                        //same date display Today
                        MessagingHistoryList[i].displayDateTime = $A.localizationService.formatDate(MessagingHistoryList[i].Date_Time__c, "HH:mm:ss")+", Today";
                    }
                    else{
                        // display date 
                        MessagingHistoryList[i].displayDateTime = $A.localizationService.formatDate(MessagingHistoryList[i].Date_Time__c, "HH:mm:ss, dd MMMM yyyy");
                    
                    }
                    
           			MessagingHistoryList[i].displayState = helper.capitaliseFirstLetter(MessagingHistoryList[i].LastMessageState__c);
					
                    console.log("varForVF_before_decodeHTMLEntities");
                    console.log(MessagingHistoryList[i].Content__c);
                    console.log("varForVF_after_decodeHTMLEntities");
					var varForVF = helper.decodeHTMLEntities(MessagingHistoryList[i].Content__c);
                    console.log(varForVF);
                    MessagingHistoryList[i].displayMsgContent = helper.decodeHTMLEntities(MessagingHistoryList[i].Content__c);
                    // sender
                    if(MessagingHistoryList[i].displayDirection == "In")
                    {
                        MessagingHistoryList[i].displaySender = CaseObj.Contact.Name;
                    }
                    else
                    {
                        MessagingHistoryList[i].displaySender =  MessagingHistoryList[i].CreatedBy.Name;
                    }

                }
                component.set("v.MessagingHistoryData",MessagingHistoryList);
            }
            else{
                //To handle server error
                console.log('Error occured while init of data '+state);
            }
        });
        $A.enqueueAction(action);
    },

    getConversationData : function(component, event, helper){
        //call getConversationDataAPEX server side method to get the MessagingConversation records
        var action = component.get("c.getConversationDataAPEX");
        var ObjectId = component.get("v.recordId");
        var ObjectType = component.get("v.sObjectName");
        action.setParams({
            "ObjectType": ObjectType,
            "ObjectId": ObjectId,
        });
        action.setCallback(this,function(response){
            var state = response.getState();
            if(state == "SUCCESS"){
                var MessagingConversationList = response.getReturnValue();
         
                component.set("v.MessagingConversationData",MessagingConversationList[0]);

                // update UI
                // set default channel in dropdown
        		var channel = MessagingConversationList[0].Channel__c;
        		component.find("selectChannel").set("v.value", channel);
                
            }
            else{
                //To handle server error
                console.log('Error occured while init of data '+state);
            }
        });
        $A.enqueueAction(action);
    },

    
    validateData : function(component, event, helper){
        var isValid = true;
        return isValid;
    },
    
    decodeHTMLEntities : function(str) {
			return str.replace(/&#(\d+);/g, function(match, dec) {
				return String.fromCodePoint(dec);
			});
    },
    
    capitaliseFirstLetter : function(strVar){
        if(strVar)
        {
        	return strVar.charAt(0).toUpperCase() + strVar.slice(1);
        }
        else
        {
            return '';
        }
    },
    
    
    sendMessage: function(component,event) {
        // wait until response to continue update ( Promise )
        return new Promise(
            $A.getCallback((resolve, reject) => {
                // create a server side action.   
                
                var action = component.get("c.sendMessagingHistory");
                console.log(action);
                console.log('just declared apex function'); 
                var channel = component.get("v.objMessagingHistory.Channel__c");
                var textContent = component.get("v.objMessagingHistory.Content__c");
                var contactPhoneNumber = component.get("v.objMessagingHistory.ContactPhoneNumber__c");
                var contactPhoneNumberStripped = contactPhoneNumber.replace(/\D/g,'');
                var BrandPhoneNumber = component.get("v.objMessagingHistory.BrandPhoneNumber__c");
                var BrandPhoneNumberStripped = BrandPhoneNumber.replace(/\D/g,'');
                action.setParams({
                    "msgTo": contactPhoneNumberStripped,
                    "msgFrom": BrandPhoneNumberStripped,
                    "channel": channel,
                    "text": textContent,
                });
                action.setCallback(this, function(response) {
                    var state = response.getState();
                    if (state === "SUCCESS") {
                        //console.log('Response from API:'+response.getReturnValue());
                        resolve(response.getReturnValue());
                    }
                    else{
                        var errors = response.getError();
                        reject("Error calling APEX send Message");
                    }
        
        
                });
                $A.enqueueAction(action);
                
            })
      );
    
    },
    
    displayError: function(component) {
        // create a server side action.   
        alert("There was an error when sending the message");
        
    }    
    
    
    
})