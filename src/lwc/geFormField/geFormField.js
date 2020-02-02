import {LightningElement, api, track, wire} from 'lwc';
import {isNotEmpty, debouncify} from 'c/utilCommon';
import GeFormService from 'c/geFormService';
import GeLabelService from 'c/geLabelService';
import {getObjectInfo} from "lightning/uiObjectInfoApi";
import TemplateBuilderService from 'c/geTemplateBuilderService';

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
    _defaultValue = null;

    richTextFormats = RICH_TEXT_FORMATS;
    CUSTOM_LABELS = GeLabelService.CUSTOM_LABELS;

    handleValueChangeSync = (event) => {
        this.value = this.getValueFromChangeEvent(event);
        // TODO: The custom event below isn't carrying up any of the assigned properties (field and value)
        // We need to set a detail property in the custom event holding whatever we want to pass in custom event.
        const evt = new CustomEvent('change', {field: this.element, value: this.value});
        this.dispatchEvent(evt);

        if (this.isLookup) {
            const detail = {
                recordId: this.value,
                fieldApiName: this.element.fieldApiName
            }
            const changeLookupEvent = new CustomEvent(
                'changelookup',
                { detail: detail });
            this.dispatchEvent(changeLookupEvent);
        }

        if(this.isRichText) {
            this.checkRichTextValidity();
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
        this.fieldsToQuery();
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

        if(this.element.required) {
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
        // PRINCE: Temporary change below. Please review and update
        // as needed.
        // Changed 'this.element.value' references to getter 'formElementName'.
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
        return GeFormService.getFieldMappingWrapper(this.formElementName);
    }

    fieldsToQuery() {
        const fmwrap = this.fieldInfo;
        const omw = this.objectInfo;
        const odn = this.objectDevName;
        const allFm = GeFormService.fieldMappings;
        const allOm = GeFormService.objectMappings;
        TemplateBuilderService.init().then(() =>
        {
            // console.log(TemplateBuilderService.fieldMappingsByObjMappingDevName);
const a =           TemplateBuilderService.fieldMappingsByObjMappingDevName[this.objectDevName];
            console.log('a: ', a);
            const b = a.map(({Source_Field_API_Name}) => Source_Field_API_Name);
            console.log('b: ', b);
            // const fields = TemplateBuilderService.fieldMappingsByObjMappingDevName[this.objectDevName].map(({Source_Field_API_Name}) => Source_Field_API_Name);
            // console.log('fields: ', fields);
        });
        // const allFmByOmName = TemplateBuilderService.fieldMappingsByObjMappingDevName;
    // const result =
        //     this.fieldInfo.objectMappingByDevName[this.objectDevName]
        //         .map(({Source_Field_API_Name}) => Source_Field_API_Name);
        console.log('*** ' + 'in fieldsToQuery' + ' ***');
        // return result;
        // return this.objectInfo.
        return b;
    }


    get fieldDescribeInfo() {
        if(this.objectDescribeInfo) {
            return this.objectDescribeInfo.fields[this.fieldApiName];
        }
    }

    get objectInfo() {
        return GeFormService.getObjectMappingWrapper(this.objectDevName);
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

    get objectDevName() {
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

    @api
    load(data) {
        const value = data[this.sourceFieldAPIName];

        if (this.isLookup) {
            const lookup = this.template.querySelector('c-ge-form-field-lookup');
            if (value) {
                const displayValue =
                    data[this.sourceFieldAPIName.replace('__c', '__r')].Name;
                lookup.setSelected({value, displayValue});
            } else {
                lookup.reset();
            }
        } else {
            this.value = value;
        }
    }

    @api
    reset() {
        if (this.isLookup) {
            const lookup = this.template.querySelector('c-ge-form-field-lookup');
            lookup.reset();
        } else {
            this.value = this._defaultValue;
        }
    }

}