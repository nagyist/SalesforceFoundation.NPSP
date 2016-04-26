({
    /*******************************************************************************************************
    * @description Notifies the application that properties of the contact have changed
    */
	fireContactChangedEvent : function(component, event) {

        // note that the contact's Naming Exclusions field is 
        // updated by NPSP triggers based off the checkbox fields.
        // so there is no reason to do it in the ui.
        
        // now notify other components the change occurred
        var event = $A.get("e.c:HH_ContactChangedEvent");
        var con = component.get('v.contact');
        event.setParams({ "contact" : con });
        event.fire();        
	},
    
    /*******************************************************************************************************
    * @description Notifies the application that the contact's delete button was pressed
    */
	fireContactDeleteEvent : function(component, event) {

        // now notify other components the delete request occurred
        var event = $A.get("e.c:HH_ContactDeleteEvent");
        var con = component.get('v.contact');
        event.setParams({ "contact" : con });
        event.fire();        
	},
    
})