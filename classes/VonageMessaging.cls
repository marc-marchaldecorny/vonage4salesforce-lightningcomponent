public with sharing class VonageMessaging {
    
    //Method to return list of VonageMessagingHistory__c records during component initialization
    @AuraEnabled
    public static List<VonageMessagingHistory__c> loadData(String ObjectType,String ObjectId){
        String SQLReq = 'SELECT ID,Date_Time__c,Content__c,Direction__c,Channel__c,createdBy.Name,LastMessageState__c FROM VonageMessagingHistory__c WHERE MessagingConversation__r.'+ObjectType+'__c=\''+ObjectId+'\' ORDER BY Date_Time__c DESC NULLS LAST';
        System.debug('List MessageHistory - SQLReq='+SQLReq);
        return Database.query(SQLReq);
    }
    
    //Method to return details over VonageMessagingConversation record during component initialization
    @AuraEnabled
    public static List< VonageMessagingConversation__c > getConversationDataAPEX(String ObjectType,String ObjectId){
        String SQLReq = 'SELECT BrandPhoneNumber__c,ContactPhoneNumber__c,DateTimeCreated__c,isUnread__c,LastMessageDirection__c,State__c,Channel__c FROM VonageMessagingConversation__c WHERE '+ObjectType+'__c=\''+ObjectId+'\' LIMIT 1';
        System.debug('List Messageconversation - SQLReq='+SQLReq);
        return Database.query(SQLReq);
    }
    
    //Method to save the record in database and return error message
    @AuraEnabled
    public static String saveMessagingHistoryRecord(VonageMessagingHistory__c MessagingHistoryRecord){
        String message;
        Database.saveResult sr = Database.insert(MessagingHistoryRecord,false);
        if(!sr.isSuccess()){
            for(Database.error err : sr.getErrors()){
                message += err.getMessage();
            }
        }
        return message;
    }
    
    //Method to send Message via Vonage
    @AuraEnabled
    public static String sendMessagingHistory(String msgTo, String msgFrom, String channel, String text) {        
    
        String result = VonageAPIMessaging.sendMessage(msgTo, msgFrom, text, channel); 
        return result;

    }  
    
    //Method to trigger VonageMessagingUpdateEvent__e event and update Lightning component
     public static void fireVMUpdateEvent(String VMConversationId) {        
    
        VonageMessagingUpdateEvent__e VMMsgUpdate = new VonageMessagingUpdateEvent__e(
        VonageMessagingConversationId__c = 'test Event');
        EventBus.publish(VMMsgUpdate);  
     }   
}