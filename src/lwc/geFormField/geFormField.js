import {LightningElement, api, track, wire} from 'lwc';
import {isNotEmpty, debouncify} from 'c/utilCommon';
import GeFormService from 'c/geFormService';
import GeLabelService from 'c/geLabelService';
import {getObjectInfo} from "lightning/uiObjectInfoApi";
import { fireEvent } from 'c/pubsubNoPageRef';
import DI_DONATION_AMOUNT from '@salesforce/schema/DataImport__c.Donation_Amount__c';

const LOOKUP_TYPE = 'REFERENCE';
const PICKLIST_TYPE = 'PICKLIST';
const TEXT_AREA_TYPE = 'TEXTAREA';
const BOOLEAN_TYPE = 'BOOLEAN';
const DELAY = 300;
const RICH_TEXT_FORMATS = [
    'font', 'size', 'bold', 'italic', 'underline', 'strike', 'list', 'indent', 'align', 'link', 'clean', 'table', 'header'
];

export default class GeFormField extends LightningElement {
    @track value;
    @track picklistValues = [];
    @track objectDescribeInfo;
    @track richTextValid = true;
    @api element;
    @api targetFieldName;
    _defaultValue = null;

    richTextFormats = RICH_TEXT_FORMATS;
    CUSTOM_LABELS = GeLabelService.CUSTOM_LABELS;

    handleValueChangeSync = (event) => {
        this.value = this.getValueFromChangeEvent(event);
        const detail = {
            element: this.element,
            value: this.value,
            targetFieldName: this.targetFieldName
        };
        const evt = new CustomEvent('valuechange', {detail, bubbles: true});
        this.dispatchEvent(evt);

        if (this.isLookup) {
            const changeLookupEvent = new CustomEvent(
                'changelookup',
                { detail: event.detail });
            this.dispatchEvent(changeLookupEvent);
        }

        if (this.isPicklist) {
            const detail = {
                value: this.value,
                fieldApiName: this.element.fieldApiName
            }

            const changePicklistEvent = new CustomEvent(
                'changepicklist',
                { detail: detail });
            this.dispatchEvent(changePicklistEvent);
        }

        if(this.isRichText) {
            this.checkRichTextValidity();
        }

        if(this.sourceFieldAPIName === DI_DONATION_AMOUNT.fieldApiName) {
            // fire event for reactive widget component containing the Data Import field API name and Value
            // currently only used for the Donation Amount.
            fireEvent(null, 'widgetData', { donationAmount: this.value });
        }
    };

    handleValueChange = debouncify(this.handleValueChangeSync.bind(this), DELAY);

    /**
     * Retrieve field metadata. Used to configure how fields are displayed on the form.
     */
    @wire(getObjectInfo, { objectApiName: '$objectApiName' })
    wiredObjectInfo(response) {
        if(response.data) {
            this.objectDescribeInfo = response.data;
        }
    }

    connectedCallback() {
        if(isNotEmpty(this.targetFieldName)) {
            // Construct an element object using the field name and mapping info
            const required = this.fieldInfo.Is_Required || (this.element && this.element.required);
            this.element = {
                ...this.element,
                label: this.fieldInfo.Target_Field_Label,
                required,
                dataImportFieldMappingDevNames: [this.targetFieldName]
            };
        }

        const { defaultValue, recordValue } = this.element;

        if(recordValue) {

            // set the record value to the element value
            this.value = recordValue;
        } else if(defaultValue) {

            // Set the default value if there is one
            // and no record value.
            this._defaultValue = defaultValue;
            this.value = defaultValue;
        }
        // this.fieldsToQuery();
    }

    getValueFromChangeEvent(event) {
        if(this.fieldType === BOOLEAN_TYPE) {
            return event.detail.checked.toString();
        } else if(this.isRichText) {
            return event.target.value;
        }

        return event.detail.value;
    }

    /**
     * TRUE when a field is required and filled in correctly, or not required at all.
     * @returns {boolean}
     */
    @api
    isValid() {
        // We need to check for invalid values, regardless if the field is required
        let fieldIsValid = this.checkFieldValidity();

        if(this.element !== null && this.element.required) {
            return isNotEmpty(this.value) && fieldIsValid;
        }

        return fieldIsValid;
    }

    /**
     * TRUE when a field is filled in, and is the correct format.
     * @returns {boolean}
     */
    checkFieldValidity() {
        // TODO: Handle other input types, if needed
        const inputField = this.template.querySelector('[data-id="inputComponent"]');
        if(typeof inputField !== 'undefined'
            && inputField !== null
            && typeof inputField.reportValidity === 'function'
            && typeof inputField.checkValidity === 'function') {
                inputField.reportValidity();
                return inputField.checkValidity();
        } else if(this.isRichText) {
            this.checkRichTextValidity();
            if(!this.richTextValid) {
                // workaround, field will not display as invalid if it is untouched
                inputField.focus();
                inputField.blur();
            }
            return this.richTextValid;
        }
        return true;
    }

    checkRichTextValidity() {
        if(this.element.required) {
            const isValid = isNotEmpty(this.value) && this.value.length > 0;
            this.richTextValid = isValid;
            return isValid;
        }
        return true;
    }

    @api
    get fieldAndValue() {
        let fieldAndValue = {};

        // KIET TBD: This is where we are keeping the field mapping
        // CMT record name at, element.value. 
        // However, it may change to the array dataImportFieldMappingDevNames
        // If so, we need to update this to reflect that.
        // In the Execute Anonymous code, both fields are populated.

        // TODO: Update for widget fields
        fieldAndValue[this.formElementName] = this.value;
        return fieldAndValue;
    }

    get formElementName() {
        return this.element.componentName ? this.element.componentName : this.element.dataImportFieldMappingDevNames[0];
    }

    get inputType() {
        return GeFormService.getInputTypeFromDataType(this.fieldType);
    }

    get formatter() {
        return GeFormService.getNumberFormatterByDescribeType(this.fieldType);
    }

    get fieldInfo() {
        return isNotEmpty(this.targetFieldName) ?
            GeFormService.getFieldMappingWrapperFromTarget(this.targetFieldName) :
            GeFormService.getFieldMappingWrapper(this.formElementName);
    }

    get fieldDescribeInfo() {
        if(this.objectDescribeInfo) {
            return this.objectDescribeInfo.fields[this.fieldApiName];
        }
    }

    get objectInfo() {
        return GeFormService.getObjectMappingWrapper(this.objectMappingDevName);
    }

    get fieldType() {
        return this.fieldInfo.Target_Field_Data_Type;
    }

    get isLightningInput() {
        return typeof GeFormService.getInputTypeFromDataType(this.fieldType) !== 'undefined';
    }

    get isRichText() {
        if(typeof this.fieldDescribeInfo !== 'undefined' && this.fieldType === TEXT_AREA_TYPE) {
            return this.fieldDescribeInfo.htmlFormatted;
        }
    }

    @api
    get isLookup() {
        return this.fieldType === LOOKUP_TYPE;
    }

    @api
    get isPicklist() {
        return this.fieldType === PICKLIST_TYPE;
    }

    get isTextArea() {
        if(typeof this.fieldDescribeInfo !== 'undefined' && this.fieldType === TEXT_AREA_TYPE) {
            return !this.fieldDescribeInfo.htmlFormatted;
        }
    }

    get objectMappingDevName() {
        return this.fieldInfo.Target_Object_Mapping_Dev_Name;
    }

    get objectApiName() {
        if(typeof this.objectInfo !== 'undefined') {
            return this.objectInfo.Object_API_Name;
        }
    }

    get fieldApiName() {
        return this.fieldInfo.Target_Field_API_Name;
    }

    @api
    get sourceFieldAPIName() {
        return this.fieldInfo.Source_Field_API_Name;
    }

    @api
    get fieldLabel() {
        return this.element.customLabel;
    }

    @api
    get fieldValueAndLabel() {

        let fieldWrapper = { value: this.value, label: this.fieldLabel };
        let returnMap = {};
        returnMap[ this.sourceFieldAPIName ] = fieldWrapper;

        return returnMap;

    }

    @api
    setCustomValidity(errorMessage) {

        let inputField = this.template.querySelector('[data-id="inputComponent"]');
        inputField.setCustomValidity(errorMessage);
        inputField.reportValidity();

    }

    @api
    clearCustomValidity() {

        if (this.isLookup) {
            let inputField = this.template.querySelector('[data-id="inputComponent"]');
            inputField.clearCustomValidity();
        } else {
            this.setCustomValidity('');
        }

    }

    /**
     * Set the value of the field.
     * @param value Value to set on the field.
     */
    @api
    load(data) {
        let value;
        if (data.hasOwnProperty(this.sourceFieldAPIName)) {
            if (data[this.sourceFieldAPIName].hasOwnProperty('value')) {
                value = data[this.sourceFieldAPIName].value;
            } else {
                value = data[this.sourceFieldAPIName];
            }
        } else {
            return;
        }

        if (value === null) {
            this.reset();
            return;
        }

        this.value = value;

        if (this.isLookup) {
            const lookup = this.template.querySelector('c-ge-form-field-lookup');

            let displayValue;
            const relationshipFieldName = this.sourceFieldAPIName.replace('__c', '__r');
            if (data[relationshipFieldName] &&
                data[relationshipFieldName]['Name']) {
                displayValue = data[relationshipFieldName].Name;
            } else if (data[this.sourceFieldAPIName]['displayValue']) {
                displayValue = data[this.sourceFieldAPIName].displayValue;
            }

            lookup.setSelected({value, displayValue});
        }
    }

    @api
    reset() {
        this.value = this._defaultValue;

        if (this.isLookup) {
            const lookup = this.template.querySelector('c-ge-form-field-lookup');
            lookup.reset();
        }
    }

}