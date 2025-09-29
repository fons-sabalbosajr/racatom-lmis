
import mongoose from 'mongoose';

const LoanClientApplicationSchema = new mongoose.Schema({
    // From Step 1
    AccountId: { type: String, unique: true },
    FirstName: { type: String, required: true },
    MiddleName: { type: String },
    LastName: { type: String, required: true },
    NameSuffix: { type: String },
    DateOfBirth: { type: Date },
    Age: { type: Number },
    ContactNo: { type: String, required: true },
    AlternateContactNo: { type: String },
    Email: { type: String },
    CurrentAddress: { type: String },
    Occupation: { type: String },
    OccupationAddress: { type: String },
    LoanRecord: { type: Boolean, default: false },
    PreviousLoan: {
        Record: String,
        Date: Date,
        Amount: Number,
        Status: String,
    },
    CoMaker: {
        Name: String,
        Address: String,
        ContactNo: String,
        Relationship: String,
    },

    ApplicationDate: { type: Date, default: Date.now },
    SimilarApplicant: { type: Boolean, default: false },
    SimilarBorrower: { type: Boolean, default: false },
    SimilarMaker: { type: Boolean, default: false },

    // From Step 2
    UploadedDocs: { type: Array },

    // From Step 3
    LoanAmount: { type: Number, required: true },
    LoanTerms: { type: Number, required: true },
    PaymentMode: { type: String, required: true },
    'Processing Fee': { type: Number },
    'Interest Rate/Month': { type: Number },
    'Penalty Rate': { type: Number },
    'Notarial Rate': { type: Number },
    'Annotation Rate': { type: Number },
    'Insurance Rate': { type: Number },
    'Vat Rate': { type: Number },
    'Doc Rate': { type: Number },
    'Misc. Rate': { type: Number },

    // Other fields from sample
    AmendedFromApplicant: String,
    AmendedFromBorrower: String,
    AmendedFromMaker: String,
    AmendedToApplicant: String,
    AmendedToBorrower: String,
    AmendedToMaker: String,
    CloseLoanDate: Date,
    CreditInvestigation: { type: Boolean, default: false },
    CreditInvestigationDate: Date,
    DaysMissed: String,
    LoanBalance: String,
    LoanCycle: String,
    LoanDescription: String,
    LoanStatus: { type: String, default: 'FOR REVIEW' },
    ORNumber: String,
    PaidToDate: String,
    PaymentAmount: String,
    PaymentDelay: String,
    Rebates: String,
    ReleaseSchedule: String,
    Remarks: String,
    RenewalStatus: String,
    RoutedTo: Object,
    Savings: String,
    ApprovalDate: Date,
    ApprovedBy: String,

}, { timestamps: true });

const LoanClientApplication = mongoose.model('LoanClientApplication', LoanClientApplicationSchema);

export default LoanClientApplication;
