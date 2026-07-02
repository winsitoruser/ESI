// Auto-generated Zod schemas from Sequelize models
// Generated: 2026-06-27T17:36:20.146Z
// Generator: scripts/generate-zod-schemas.js

import { z } from 'zod';

// ============================================================
// MODEL SCHEMAS
// ============================================================

export const ActivationRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ActivationRequestCreateSchema = z.object({

});
export const ActivationRequestUpdateSchema = z.object({

});
export const AlertActionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AlertActionCreateSchema = z.object({

});
export const AlertActionUpdateSchema = z.object({

});
export const AlertSubscriptionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AlertSubscriptionCreateSchema = z.object({

});
export const AlertSubscriptionUpdateSchema = z.object({

});
export const AnnouncementSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AnnouncementCreateSchema = z.object({

});
export const AnnouncementUpdateSchema = z.object({

});
export const AssetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AssetCreateSchema = z.object({

});
export const AssetUpdateSchema = z.object({

});
export const AssetCategorySchema = z.object({
  id: z.string().uuid().nullish()
});
export const AssetCategoryCreateSchema = z.object({

});
export const AssetCategoryUpdateSchema = z.object({

});
export const AssetLicenseSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AssetLicenseCreateSchema = z.object({

});
export const AssetLicenseUpdateSchema = z.object({

});
export const AssetMaintenanceScheduleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AssetMaintenanceScheduleCreateSchema = z.object({

});
export const AssetMaintenanceScheduleUpdateSchema = z.object({

});
export const AssetMovementSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AssetMovementCreateSchema = z.object({

});
export const AssetMovementUpdateSchema = z.object({

});
export const AssetTenancySchema = z.object({
  id: z.string().uuid().nullish()
});
export const AssetTenancyCreateSchema = z.object({

});
export const AssetTenancyUpdateSchema = z.object({

});
export const AssetWorkOrderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AssetWorkOrderCreateSchema = z.object({

});
export const AssetWorkOrderUpdateSchema = z.object({

});
export const AttendanceDeviceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AttendanceDeviceCreateSchema = z.object({

});
export const AttendanceDeviceUpdateSchema = z.object({

});
export const AttendanceDeviceLogSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AttendanceDeviceLogCreateSchema = z.object({

});
export const AttendanceDeviceLogUpdateSchema = z.object({

});
export const AttendanceSettingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AttendanceSettingCreateSchema = z.object({

});
export const AttendanceSettingUpdateSchema = z.object({

});
export const AttendanceSettingsSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AttendanceSettingsCreateSchema = z.object({

});
export const AttendanceSettingsUpdateSchema = z.object({

});
export const AuditLogSchema = z.object({
  id: z.string().uuid().nullish()
});
export const AuditLogCreateSchema = z.object({

});
export const AuditLogUpdateSchema = z.object({

});
export const BillingCycleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const BillingCycleCreateSchema = z.object({

});
export const BillingCycleUpdateSchema = z.object({

});
export const BranchSchema = z.object({
  id: z.string().uuid().nullish()
});
export const BranchCreateSchema = z.object({

});
export const BranchUpdateSchema = z.object({

});
export const BranchModuleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const BranchModuleCreateSchema = z.object({

});
export const BranchModuleUpdateSchema = z.object({

});
export const BranchRealTimeMetricsSchema = z.object({
  id: z.string().uuid().nullish()
});
export const BranchRealTimeMetricsCreateSchema = z.object({

});
export const BranchRealTimeMetricsUpdateSchema = z.object({

});
export const BranchSetupSchema = z.object({
  id: z.string().uuid().nullish()
});
export const BranchSetupCreateSchema = z.object({

});
export const BranchSetupUpdateSchema = z.object({

});
export const BusinessTypeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const BusinessTypeCreateSchema = z.object({

});
export const BusinessTypeUpdateSchema = z.object({

});
export const BusinessTypeModuleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const BusinessTypeModuleCreateSchema = z.object({

});
export const BusinessTypeModuleUpdateSchema = z.object({

});
export const CategorySchema = z.object({
  id: z.string().uuid().nullish()
});
export const CategoryCreateSchema = z.object({

});
export const CategoryUpdateSchema = z.object({

});
export const CompanyRegulationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CompanyRegulationCreateSchema = z.object({

});
export const CompanyRegulationUpdateSchema = z.object({

});
export const ComplianceChecklistSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ComplianceChecklistCreateSchema = z.object({

});
export const ComplianceChecklistUpdateSchema = z.object({

});
export const ContractReminderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ContractReminderCreateSchema = z.object({

});
export const ContractReminderUpdateSchema = z.object({

});
export const CrmAutomationLogSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmAutomationLogCreateSchema = z.object({

});
export const CrmAutomationLogUpdateSchema = z.object({

});
export const CrmAutomationRuleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmAutomationRuleCreateSchema = z.object({

});
export const CrmAutomationRuleUpdateSchema = z.object({

});
export const CrmCalendarEventSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmCalendarEventCreateSchema = z.object({

});
export const CrmCalendarEventUpdateSchema = z.object({

});
export const CrmCommCampaignSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmCommCampaignCreateSchema = z.object({

});
export const CrmCommCampaignUpdateSchema = z.object({

});
export const CrmCommunicationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmCommunicationCreateSchema = z.object({

});
export const CrmCommunicationUpdateSchema = z.object({

});
export const CrmContactSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmContactCreateSchema = z.object({

});
export const CrmContactUpdateSchema = z.object({

});
export const CrmCustomDashboardSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmCustomDashboardCreateSchema = z.object({

});
export const CrmCustomDashboardUpdateSchema = z.object({

});
export const CrmCustomerSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmCustomerCreateSchema = z.object({

});
export const CrmCustomerUpdateSchema = z.object({

});
export const CrmCustomerSegmentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmCustomerSegmentCreateSchema = z.object({

});
export const CrmCustomerSegmentUpdateSchema = z.object({

});
export const CrmCustomerTagSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmCustomerTagCreateSchema = z.object({

});
export const CrmCustomerTagUpdateSchema = z.object({

});
export const CrmDealScoreSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmDealScoreCreateSchema = z.object({

});
export const CrmDealScoreUpdateSchema = z.object({

});
export const CrmDocumentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmDocumentCreateSchema = z.object({

});
export const CrmDocumentUpdateSchema = z.object({

});
export const CrmDocumentTemplateSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmDocumentTemplateCreateSchema = z.object({

});
export const CrmDocumentTemplateUpdateSchema = z.object({

});
export const CrmEmailTemplateSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmEmailTemplateCreateSchema = z.object({

});
export const CrmEmailTemplateUpdateSchema = z.object({

});
export const CrmFollowUpSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmFollowUpCreateSchema = z.object({

});
export const CrmFollowUpUpdateSchema = z.object({

});
export const CrmForecastSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmForecastCreateSchema = z.object({

});
export const CrmForecastUpdateSchema = z.object({

});
export const CrmForecastItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmForecastItemCreateSchema = z.object({

});
export const CrmForecastItemUpdateSchema = z.object({

});
export const CrmInteractionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmInteractionCreateSchema = z.object({

});
export const CrmInteractionUpdateSchema = z.object({

});
export const CrmSatisfactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmSatisfactionCreateSchema = z.object({

});
export const CrmSatisfactionUpdateSchema = z.object({

});
export const CrmSavedReportSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmSavedReportCreateSchema = z.object({

});
export const CrmSavedReportUpdateSchema = z.object({

});
export const CrmSlaPolicySchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmSlaPolicyCreateSchema = z.object({

});
export const CrmSlaPolicyUpdateSchema = z.object({

});
export const CrmTaskSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmTaskCreateSchema = z.object({

});
export const CrmTaskUpdateSchema = z.object({

});
export const CrmTaskTemplateSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmTaskTemplateCreateSchema = z.object({

});
export const CrmTaskTemplateUpdateSchema = z.object({

});
export const CrmTicketSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmTicketCreateSchema = z.object({

});
export const CrmTicketUpdateSchema = z.object({

});
export const CrmTicketCommentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CrmTicketCommentCreateSchema = z.object({

});
export const CrmTicketCommentUpdateSchema = z.object({

});
export const CustomerSchema = z.object({
  id: z.string().uuid().nullish()
});
export const CustomerCreateSchema = z.object({

});
export const CustomerUpdateSchema = z.object({

});
export const CustomerLoyaltySchema = z.object({
  id: z.string().uuid().nullish()
});
export const CustomerLoyaltyCreateSchema = z.object({

});
export const CustomerLoyaltyUpdateSchema = z.object({

});
export const DmsAccessLogSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsAccessLogCreateSchema = z.object({

});
export const DmsAccessLogUpdateSchema = z.object({

});
export const DmsDisposalBatchSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsDisposalBatchCreateSchema = z.object({

});
export const DmsDisposalBatchUpdateSchema = z.object({

});
export const DmsDispositionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsDispositionCreateSchema = z.object({

});
export const DmsDispositionUpdateSchema = z.object({

});
export const DmsFileSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsFileCreateSchema = z.object({

});
export const DmsFileUpdateSchema = z.object({

});
export const DmsFolderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsFolderCreateSchema = z.object({

});
export const DmsFolderUpdateSchema = z.object({

});
export const DmsHierarchyNodeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsHierarchyNodeCreateSchema = z.object({

});
export const DmsHierarchyNodeUpdateSchema = z.object({

});
export const DmsKnowledgeEdgeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsKnowledgeEdgeCreateSchema = z.object({

});
export const DmsKnowledgeEdgeUpdateSchema = z.object({

});
export const DmsLetterSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsLetterCreateSchema = z.object({

});
export const DmsLetterUpdateSchema = z.object({

});
export const DmsMataElangShareSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsMataElangShareCreateSchema = z.object({

});
export const DmsMataElangShareUpdateSchema = z.object({

});
export const DmsOpenDatasetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsOpenDatasetCreateSchema = z.object({

});
export const DmsOpenDatasetUpdateSchema = z.object({

});
export const DmsPpidRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsPpidRequestCreateSchema = z.object({

});
export const DmsPpidRequestUpdateSchema = z.object({

});
export const DmsRecordsClassificationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsRecordsClassificationCreateSchema = z.object({

});
export const DmsRecordsClassificationUpdateSchema = z.object({

});
export const DmsRetentionPolicySchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsRetentionPolicyCreateSchema = z.object({

});
export const DmsRetentionPolicyUpdateSchema = z.object({

});
export const DmsSignatureSchema = z.object({
  id: z.string().uuid().nullish()
});
export const DmsSignatureCreateSchema = z.object({

});
export const DmsSignatureUpdateSchema = z.object({

});
export const EmployeeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeCreateSchema = z.object({

});
export const EmployeeUpdateSchema = z.object({

});
export const EmployeeAttendanceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeAttendanceCreateSchema = z.object({

});
export const EmployeeAttendanceUpdateSchema = z.object({

});
export const EmployeeCertificationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeCertificationCreateSchema = z.object({

});
export const EmployeeCertificationUpdateSchema = z.object({

});
export const EmployeeClaimSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeClaimCreateSchema = z.object({

});
export const EmployeeClaimUpdateSchema = z.object({

});
export const EmployeeContractSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeContractCreateSchema = z.object({

});
export const EmployeeContractUpdateSchema = z.object({

});
export const EmployeeDocumentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeDocumentCreateSchema = z.object({

});
export const EmployeeDocumentUpdateSchema = z.object({

});
export const EmployeeEducationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeEducationCreateSchema = z.object({

});
export const EmployeeEducationUpdateSchema = z.object({

});
export const EmployeeFamilySchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeFamilyCreateSchema = z.object({

});
export const EmployeeFamilyUpdateSchema = z.object({

});
export const EmployeeKPISchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeKPICreateSchema = z.object({

});
export const EmployeeKPIUpdateSchema = z.object({

});
export const EmployeeMutationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeMutationCreateSchema = z.object({

});
export const EmployeeMutationUpdateSchema = z.object({

});
export const EmployeeSalarySchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeSalaryCreateSchema = z.object({

});
export const EmployeeSalaryUpdateSchema = z.object({

});
export const EmployeeScheduleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeScheduleCreateSchema = z.object({

});
export const EmployeeScheduleUpdateSchema = z.object({

});
export const EmployeeSkillSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeSkillCreateSchema = z.object({

});
export const EmployeeSkillUpdateSchema = z.object({

});
export const EmployeeWorkExperienceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EmployeeWorkExperienceCreateSchema = z.object({

});
export const EmployeeWorkExperienceUpdateSchema = z.object({

});
export const EprContractSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprContractCreateSchema = z.object({

});
export const EprContractUpdateSchema = z.object({

});
export const EprEvaluationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprEvaluationCreateSchema = z.object({

});
export const EprEvaluationUpdateSchema = z.object({

});
export const EprProcurementRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprProcurementRequestCreateSchema = z.object({

});
export const EprProcurementRequestUpdateSchema = z.object({

});
export const EprRfqSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprRfqCreateSchema = z.object({

});
export const EprRfqUpdateSchema = z.object({

});
export const EprRfqItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprRfqItemCreateSchema = z.object({

});
export const EprRfqItemUpdateSchema = z.object({

});
export const EprRfqResponseSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprRfqResponseCreateSchema = z.object({

});
export const EprRfqResponseUpdateSchema = z.object({

});
export const EprSettingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprSettingCreateSchema = z.object({

});
export const EprSettingUpdateSchema = z.object({

});
export const EprTenderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprTenderCreateSchema = z.object({

});
export const EprTenderUpdateSchema = z.object({

});
export const EprTenderBidSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprTenderBidCreateSchema = z.object({

});
export const EprTenderBidUpdateSchema = z.object({

});
export const EprVendorSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EprVendorCreateSchema = z.object({

});
export const EprVendorUpdateSchema = z.object({

});
export const EximContainerSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximContainerCreateSchema = z.object({

});
export const EximContainerUpdateSchema = z.object({

});
export const EximCostSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximCostCreateSchema = z.object({

});
export const EximCostUpdateSchema = z.object({

});
export const EximCustomsSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximCustomsCreateSchema = z.object({

});
export const EximCustomsUpdateSchema = z.object({

});
export const EximDocumentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximDocumentCreateSchema = z.object({

});
export const EximDocumentUpdateSchema = z.object({

});
export const EximHsCodeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximHsCodeCreateSchema = z.object({

});
export const EximHsCodeUpdateSchema = z.object({

});
export const EximLCSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximLCCreateSchema = z.object({

});
export const EximLCUpdateSchema = z.object({

});
export const EximPartnerSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximPartnerCreateSchema = z.object({

});
export const EximPartnerUpdateSchema = z.object({

});
export const EximSettingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximSettingCreateSchema = z.object({

});
export const EximSettingUpdateSchema = z.object({

});
export const EximShipmentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const EximShipmentCreateSchema = z.object({

});
export const EximShipmentUpdateSchema = z.object({

});
export const ExpenseBudgetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ExpenseBudgetCreateSchema = z.object({

});
export const ExpenseBudgetUpdateSchema = z.object({

});
export const FinanceAccountSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceAccountCreateSchema = z.object({

});
export const FinanceAccountUpdateSchema = z.object({

});
export const FinanceBudgetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceBudgetCreateSchema = z.object({

});
export const FinanceBudgetUpdateSchema = z.object({

});
export const FinanceInvoiceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceInvoiceCreateSchema = z.object({

});
export const FinanceInvoiceUpdateSchema = z.object({

});
export const FinanceInvoiceItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceInvoiceItemCreateSchema = z.object({

});
export const FinanceInvoiceItemUpdateSchema = z.object({

});
export const FinanceInvoicePaymentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceInvoicePaymentCreateSchema = z.object({

});
export const FinanceInvoicePaymentUpdateSchema = z.object({

});
export const FinancePayableSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinancePayableCreateSchema = z.object({

});
export const FinancePayableUpdateSchema = z.object({

});
export const FinancePayablePaymentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinancePayablePaymentCreateSchema = z.object({

});
export const FinancePayablePaymentUpdateSchema = z.object({

});
export const FinanceReceivableSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceReceivableCreateSchema = z.object({

});
export const FinanceReceivableUpdateSchema = z.object({

});
export const FinanceReceivablePaymentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceReceivablePaymentCreateSchema = z.object({

});
export const FinanceReceivablePaymentUpdateSchema = z.object({

});
export const FinanceTransactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FinanceTransactionCreateSchema = z.object({

});
export const FinanceTransactionUpdateSchema = z.object({

});
export const FleetDeliveryProofSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetDeliveryProofCreateSchema = z.object({

});
export const FleetDeliveryProofUpdateSchema = z.object({

});
export const FleetDriverSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetDriverCreateSchema = z.object({

});
export const FleetDriverUpdateSchema = z.object({

});
export const FleetDriverExpenseSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetDriverExpenseCreateSchema = z.object({

});
export const FleetDriverExpenseUpdateSchema = z.object({

});
export const FleetFuelTransactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetFuelTransactionCreateSchema = z.object({

});
export const FleetFuelTransactionUpdateSchema = z.object({

});
export const FleetGpsLocationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetGpsLocationCreateSchema = z.object({

});
export const FleetGpsLocationUpdateSchema = z.object({

});
export const FleetMaintenanceScheduleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetMaintenanceScheduleCreateSchema = z.object({

});
export const FleetMaintenanceScheduleUpdateSchema = z.object({

});
export const FleetRouteSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetRouteCreateSchema = z.object({

});
export const FleetRouteUpdateSchema = z.object({

});
export const FleetRouteAssignmentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetRouteAssignmentCreateSchema = z.object({

});
export const FleetRouteAssignmentUpdateSchema = z.object({

});
export const FleetVehicleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetVehicleCreateSchema = z.object({

});
export const FleetVehicleUpdateSchema = z.object({

});
export const FleetVehicleInspectionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const FleetVehicleInspectionCreateSchema = z.object({

});
export const FleetVehicleInspectionUpdateSchema = z.object({

});
export const GeofenceLocationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const GeofenceLocationCreateSchema = z.object({

});
export const GeofenceLocationUpdateSchema = z.object({

});
export const GoodsReceiptSchema = z.object({
  id: z.string().uuid().nullish()
});
export const GoodsReceiptCreateSchema = z.object({

});
export const GoodsReceiptUpdateSchema = z.object({

});
export const GoodsReceiptItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const GoodsReceiptItemCreateSchema = z.object({

});
export const GoodsReceiptItemUpdateSchema = z.object({

});
export const HRISWebhookLogSchema = z.object({
  id: z.string().uuid().nullish()
});
export const HRISWebhookLogCreateSchema = z.object({

});
export const HRISWebhookLogUpdateSchema = z.object({

});
export const HeadcountPlanSchema = z.object({
  id: z.string().uuid().nullish()
});
export const HeadcountPlanCreateSchema = z.object({

});
export const HeadcountPlanUpdateSchema = z.object({

});
export const HeldTransactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const HeldTransactionCreateSchema = z.object({

});
export const HeldTransactionUpdateSchema = z.object({

});
export const IncidentReportSchema = z.object({
  id: z.number().int().nullish()
});
export const IncidentReportCreateSchema = z.object({

});
export const IncidentReportUpdateSchema = z.object({

});
export const IntegrationConfigSchema = z.object({
  id: z.string().uuid().nullish()
});
export const IntegrationConfigCreateSchema = z.object({

});
export const IntegrationConfigUpdateSchema = z.object({

});
export const IntegrationLogSchema = z.object({
  id: z.string().uuid().nullish()
});
export const IntegrationLogCreateSchema = z.object({

});
export const IntegrationLogUpdateSchema = z.object({

});
export const IntegrationProviderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const IntegrationProviderCreateSchema = z.object({

});
export const IntegrationProviderUpdateSchema = z.object({

});
export const IntegrationRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const IntegrationRequestCreateSchema = z.object({

});
export const IntegrationRequestUpdateSchema = z.object({

});
export const IntegrationWebhookSchema = z.object({
  id: z.string().uuid().nullish()
});
export const IntegrationWebhookCreateSchema = z.object({

});
export const IntegrationWebhookUpdateSchema = z.object({

});
export const InternalRequisitionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const InternalRequisitionCreateSchema = z.object({

});
export const InternalRequisitionUpdateSchema = z.object({

});
export const InternalRequisitionItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const InternalRequisitionItemCreateSchema = z.object({

});
export const InternalRequisitionItemUpdateSchema = z.object({

});
export const InvoiceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const InvoiceCreateSchema = z.object({

});
export const InvoiceUpdateSchema = z.object({

});
export const InvoiceItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const InvoiceItemCreateSchema = z.object({

});
export const InvoiceItemUpdateSchema = z.object({

});
export const IrCaseSchema = z.object({
  id: z.string().uuid().nullish()
});
export const IrCaseCreateSchema = z.object({

});
export const IrCaseUpdateSchema = z.object({

});
export const JobGradeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const JobGradeCreateSchema = z.object({

});
export const JobGradeUpdateSchema = z.object({

});
export const KPIScoringSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KPIScoringCreateSchema = z.object({

});
export const KPIScoringUpdateSchema = z.object({

});
export const KPITemplateSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KPITemplateCreateSchema = z.object({

});
export const KPITemplateUpdateSchema = z.object({

});
export const KitchenInventoryItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenInventoryItemCreateSchema = z.object({

});
export const KitchenInventoryItemUpdateSchema = z.object({

});
export const KitchenInventoryTransactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenInventoryTransactionCreateSchema = z.object({

});
export const KitchenInventoryTransactionUpdateSchema = z.object({

});
export const KitchenOrderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenOrderCreateSchema = z.object({

});
export const KitchenOrderUpdateSchema = z.object({

});
export const KitchenOrderItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenOrderItemCreateSchema = z.object({

});
export const KitchenOrderItemUpdateSchema = z.object({

});
export const KitchenRecipeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenRecipeCreateSchema = z.object({

});
export const KitchenRecipeUpdateSchema = z.object({

});
export const KitchenRecipeIngredientSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenRecipeIngredientCreateSchema = z.object({

});
export const KitchenRecipeIngredientUpdateSchema = z.object({

});
export const KitchenSettingsSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenSettingsCreateSchema = z.object({

});
export const KitchenSettingsUpdateSchema = z.object({

});
export const KitchenStaffSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KitchenStaffCreateSchema = z.object({

});
export const KitchenStaffUpdateSchema = z.object({

});
export const KybApplicationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KybApplicationCreateSchema = z.object({

});
export const KybApplicationUpdateSchema = z.object({

});
export const KybDocumentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const KybDocumentCreateSchema = z.object({

});
export const KybDocumentUpdateSchema = z.object({

});
export const LeaveApprovalConfigSchema = z.object({
  id: z.string().uuid().nullish()
});
export const LeaveApprovalConfigCreateSchema = z.object({

});
export const LeaveApprovalConfigUpdateSchema = z.object({

});
export const LeaveBalanceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const LeaveBalanceCreateSchema = z.object({

});
export const LeaveBalanceUpdateSchema = z.object({

});
export const LeaveRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const LeaveRequestCreateSchema = z.object({

});
export const LeaveRequestUpdateSchema = z.object({

});
export const LeaveTypeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const LeaveTypeCreateSchema = z.object({

});
export const LeaveTypeUpdateSchema = z.object({

});
export const LocationSchema = z.object({
  id: z.number().int().nullish()
});
export const LocationCreateSchema = z.object({

});
export const LocationUpdateSchema = z.object({

});
export const LoyaltyProgramSchema = z.object({
  id: z.string().uuid().nullish()
});
export const LoyaltyProgramCreateSchema = z.object({

});
export const LoyaltyProgramUpdateSchema = z.object({

});
export const LoyaltyRewardSchema = z.object({
  id: z.string().uuid().nullish()
});
export const LoyaltyRewardCreateSchema = z.object({

});
export const LoyaltyRewardUpdateSchema = z.object({

});
export const LoyaltyTierSchema = z.object({
  id: z.string().uuid().nullish()
});
export const LoyaltyTierCreateSchema = z.object({

});
export const LoyaltyTierUpdateSchema = z.object({

});
export const ManpowerBudgetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ManpowerBudgetCreateSchema = z.object({

});
export const ManpowerBudgetUpdateSchema = z.object({

});
export const MfgBomSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgBomCreateSchema = z.object({

});
export const MfgBomUpdateSchema = z.object({

});
export const MfgBomItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgBomItemCreateSchema = z.object({

});
export const MfgBomItemUpdateSchema = z.object({

});
export const MfgMachineSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgMachineCreateSchema = z.object({

});
export const MfgMachineUpdateSchema = z.object({

});
export const MfgMaintenanceRecordSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgMaintenanceRecordCreateSchema = z.object({

});
export const MfgMaintenanceRecordUpdateSchema = z.object({

});
export const MfgProductionCostSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgProductionCostCreateSchema = z.object({

});
export const MfgProductionCostUpdateSchema = z.object({

});
export const MfgProductionPlanSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgProductionPlanCreateSchema = z.object({

});
export const MfgProductionPlanUpdateSchema = z.object({

});
export const MfgProductionPlanItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgProductionPlanItemCreateSchema = z.object({

});
export const MfgProductionPlanItemUpdateSchema = z.object({

});
export const MfgQcInspectionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgQcInspectionCreateSchema = z.object({

});
export const MfgQcInspectionUpdateSchema = z.object({

});
export const MfgQcResultSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgQcResultCreateSchema = z.object({

});
export const MfgQcResultUpdateSchema = z.object({

});
export const MfgQcTemplateSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgQcTemplateCreateSchema = z.object({

});
export const MfgQcTemplateUpdateSchema = z.object({

});
export const MfgRoutingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgRoutingCreateSchema = z.object({

});
export const MfgRoutingUpdateSchema = z.object({

});
export const MfgRoutingOperationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgRoutingOperationCreateSchema = z.object({

});
export const MfgRoutingOperationUpdateSchema = z.object({

});
export const MfgSettingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgSettingCreateSchema = z.object({

});
export const MfgSettingUpdateSchema = z.object({

});
export const MfgShiftProductionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgShiftProductionCreateSchema = z.object({

});
export const MfgShiftProductionUpdateSchema = z.object({

});
export const MfgWasteRecordSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgWasteRecordCreateSchema = z.object({

});
export const MfgWasteRecordUpdateSchema = z.object({

});
export const MfgWoMaterialSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgWoMaterialCreateSchema = z.object({

});
export const MfgWoMaterialUpdateSchema = z.object({

});
export const MfgWoOperationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgWoOperationCreateSchema = z.object({

});
export const MfgWoOperationUpdateSchema = z.object({

});
export const MfgWoOutputSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgWoOutputCreateSchema = z.object({

});
export const MfgWoOutputUpdateSchema = z.object({

});
export const MfgWorkCenterSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgWorkCenterCreateSchema = z.object({

});
export const MfgWorkCenterUpdateSchema = z.object({

});
export const MfgWorkOrderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MfgWorkOrderCreateSchema = z.object({

});
export const MfgWorkOrderUpdateSchema = z.object({

});
export const MktBudgetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktBudgetCreateSchema = z.object({

});
export const MktBudgetUpdateSchema = z.object({

});
export const MktBudgetItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktBudgetItemCreateSchema = z.object({

});
export const MktBudgetItemUpdateSchema = z.object({

});
export const MktCampaignSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktCampaignCreateSchema = z.object({

});
export const MktCampaignUpdateSchema = z.object({

});
export const MktCampaignAudienceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktCampaignAudienceCreateSchema = z.object({

});
export const MktCampaignAudienceUpdateSchema = z.object({

});
export const MktCampaignChannelSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktCampaignChannelCreateSchema = z.object({

});
export const MktCampaignChannelUpdateSchema = z.object({

});
export const MktContentAssetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktContentAssetCreateSchema = z.object({

});
export const MktContentAssetUpdateSchema = z.object({

});
export const MktPromotionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktPromotionCreateSchema = z.object({

});
export const MktPromotionUpdateSchema = z.object({

});
export const MktPromotionUsageSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktPromotionUsageCreateSchema = z.object({

});
export const MktPromotionUsageUpdateSchema = z.object({

});
export const MktSegmentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktSegmentCreateSchema = z.object({

});
export const MktSegmentUpdateSchema = z.object({

});
export const MktSegmentRuleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const MktSegmentRuleCreateSchema = z.object({

});
export const MktSegmentRuleUpdateSchema = z.object({

});
export const ModuleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ModuleCreateSchema = z.object({

});
export const ModuleUpdateSchema = z.object({

});
export const ModuleDependencySchema = z.object({
  id: z.string().uuid().nullish()
});
export const ModuleDependencyCreateSchema = z.object({

});
export const ModuleDependencyUpdateSchema = z.object({

});
export const ModulePricingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ModulePricingCreateSchema = z.object({

});
export const ModulePricingUpdateSchema = z.object({

});
export const NotificationSettingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const NotificationSettingCreateSchema = z.object({

});
export const NotificationSettingUpdateSchema = z.object({

});
export const OrgStructureSchema = z.object({
  id: z.string().uuid().nullish()
});
export const OrgStructureCreateSchema = z.object({

});
export const OrgStructureUpdateSchema = z.object({

});
export const OutletIntegrationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const OutletIntegrationCreateSchema = z.object({

});
export const OutletIntegrationUpdateSchema = z.object({

});
export const PartnerSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PartnerCreateSchema = z.object({

});
export const PartnerUpdateSchema = z.object({

});
export const PartnerIntegrationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PartnerIntegrationCreateSchema = z.object({

});
export const PartnerIntegrationUpdateSchema = z.object({

});
export const PartnerOutletSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PartnerOutletCreateSchema = z.object({

});
export const PartnerOutletUpdateSchema = z.object({

});
export const PartnerSubscriptionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PartnerSubscriptionCreateSchema = z.object({

});
export const PartnerSubscriptionUpdateSchema = z.object({

});
export const PartnerUserSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PartnerUserCreateSchema = z.object({

});
export const PartnerUserUpdateSchema = z.object({

});
export const PaymentTransactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PaymentTransactionCreateSchema = z.object({

});
export const PaymentTransactionUpdateSchema = z.object({

});
export const PayrollComponentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PayrollComponentCreateSchema = z.object({

});
export const PayrollComponentUpdateSchema = z.object({

});
export const PayrollRunSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PayrollRunCreateSchema = z.object({

});
export const PayrollRunUpdateSchema = z.object({

});
export const PerformanceReviewSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PerformanceReviewCreateSchema = z.object({

});
export const PerformanceReviewUpdateSchema = z.object({

});
export const PjmBudgetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmBudgetCreateSchema = z.object({

});
export const PjmBudgetUpdateSchema = z.object({

});
export const PjmDocumentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmDocumentCreateSchema = z.object({

});
export const PjmDocumentUpdateSchema = z.object({

});
export const PjmMilestoneSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmMilestoneCreateSchema = z.object({

});
export const PjmMilestoneUpdateSchema = z.object({

});
export const PjmProjectSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmProjectCreateSchema = z.object({

});
export const PjmProjectUpdateSchema = z.object({

});
export const PjmResourceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmResourceCreateSchema = z.object({

});
export const PjmResourceUpdateSchema = z.object({

});
export const PjmRiskSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmRiskCreateSchema = z.object({

});
export const PjmRiskUpdateSchema = z.object({

});
export const PjmSettingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmSettingCreateSchema = z.object({

});
export const PjmSettingUpdateSchema = z.object({

});
export const PjmTaskSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmTaskCreateSchema = z.object({

});
export const PjmTaskUpdateSchema = z.object({

});
export const PjmTimesheetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PjmTimesheetCreateSchema = z.object({

});
export const PjmTimesheetUpdateSchema = z.object({

});
export const PlanSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PlanCreateSchema = z.object({

});
export const PlanUpdateSchema = z.object({

});
export const PlanLimitSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PlanLimitCreateSchema = z.object({

});
export const PlanLimitUpdateSchema = z.object({

});
export const PointTransactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PointTransactionCreateSchema = z.object({

});
export const PointTransactionUpdateSchema = z.object({

});
export const PosTransactionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PosTransactionCreateSchema = z.object({

});
export const PosTransactionUpdateSchema = z.object({

});
export const PosTransactionItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PosTransactionItemCreateSchema = z.object({

});
export const PosTransactionItemUpdateSchema = z.object({

});
export const PriceTierSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PriceTierCreateSchema = z.object({

});
export const PriceTierUpdateSchema = z.object({

});
export const PrinterConfigSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PrinterConfigCreateSchema = z.object({

});
export const PrinterConfigUpdateSchema = z.object({

});
export const ProductSchema = z.object({
  id: z.number().int().nullish()
});
export const ProductCreateSchema = z.object({

});
export const ProductUpdateSchema = z.object({

});
export const ProductCostComponentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ProductCostComponentCreateSchema = z.object({

});
export const ProductCostComponentUpdateSchema = z.object({

});
export const ProductCostHistorySchema = z.object({
  id: z.string().uuid().nullish()
});
export const ProductCostHistoryCreateSchema = z.object({

});
export const ProductCostHistoryUpdateSchema = z.object({

});
export const ProductPriceSchema = z.object({
  id: z.number().int().nullish()
});
export const ProductPriceCreateSchema = z.object({

});
export const ProductPriceUpdateSchema = z.object({

});
export const ProductVariantSchema = z.object({
  id: z.number().int().nullish()
});
export const ProductVariantCreateSchema = z.object({

});
export const ProductVariantUpdateSchema = z.object({

});
export const ProductionSchema = z.object({
  id: z.number().int().nullish()
});
export const ProductionCreateSchema = z.object({

});
export const ProductionUpdateSchema = z.object({

});
export const ProductionHistorySchema = z.object({
  id: z.number().int().nullish()
});
export const ProductionHistoryCreateSchema = z.object({

});
export const ProductionHistoryUpdateSchema = z.object({

});
export const ProductionMaterialSchema = z.object({
  id: z.number().int().nullish()
});
export const ProductionMaterialCreateSchema = z.object({

});
export const ProductionMaterialUpdateSchema = z.object({

});
export const ProductionWasteSchema = z.object({
  id: z.number().int().nullish()
});
export const ProductionWasteCreateSchema = z.object({

});
export const ProductionWasteUpdateSchema = z.object({

});
export const ProjectSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ProjectCreateSchema = z.object({

});
export const ProjectUpdateSchema = z.object({

});
export const ProjectPayrollSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ProjectPayrollCreateSchema = z.object({

});
export const ProjectPayrollUpdateSchema = z.object({

});
export const ProjectTimesheetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ProjectTimesheetCreateSchema = z.object({

});
export const ProjectTimesheetUpdateSchema = z.object({

});
export const ProjectWorkerSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ProjectWorkerCreateSchema = z.object({

});
export const ProjectWorkerUpdateSchema = z.object({

});
export const PromoSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PromoCreateSchema = z.object({

});
export const PromoUpdateSchema = z.object({

});
export const PromoBundleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PromoBundleCreateSchema = z.object({

});
export const PromoBundleUpdateSchema = z.object({

});
export const PromoCategorySchema = z.object({
  id: z.string().uuid().nullish()
});
export const PromoCategoryCreateSchema = z.object({

});
export const PromoCategoryUpdateSchema = z.object({

});
export const PromoProductSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PromoProductCreateSchema = z.object({

});
export const PromoProductUpdateSchema = z.object({

});
export const PurchaseOrderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PurchaseOrderCreateSchema = z.object({

});
export const PurchaseOrderUpdateSchema = z.object({

});
export const PurchaseOrderItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const PurchaseOrderItemCreateSchema = z.object({

});
export const PurchaseOrderItemUpdateSchema = z.object({

});
export const RecipeSchema = z.object({
  id: z.number().int().nullish()
});
export const RecipeCreateSchema = z.object({

});
export const RecipeUpdateSchema = z.object({

});
export const RecipeHistorySchema = z.object({
  id: z.number().int().nullish()
});
export const RecipeHistoryCreateSchema = z.object({

});
export const RecipeHistoryUpdateSchema = z.object({

});
export const RecipeIngredientSchema = z.object({
  id: z.number().int().nullish()
});
export const RecipeIngredientCreateSchema = z.object({

});
export const RecipeIngredientUpdateSchema = z.object({

});
export const RecognitionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const RecognitionCreateSchema = z.object({

});
export const RecognitionUpdateSchema = z.object({

});
export const ReservationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ReservationCreateSchema = z.object({

});
export const ReservationUpdateSchema = z.object({

});
export const RewardRedemptionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const RewardRedemptionCreateSchema = z.object({

});
export const RewardRedemptionUpdateSchema = z.object({

});
export const RoleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const RoleCreateSchema = z.object({

});
export const RoleUpdateSchema = z.object({

});
export const SalesOrderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SalesOrderCreateSchema = z.object({

});
export const SalesOrderUpdateSchema = z.object({

});
export const SalesOrderItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SalesOrderItemCreateSchema = z.object({

});
export const SalesOrderItemUpdateSchema = z.object({

});
export const SfaAchievementSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaAchievementCreateSchema = z.object({

});
export const SfaAchievementUpdateSchema = z.object({

});
export const SfaAchievementDetailSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaAchievementDetailCreateSchema = z.object({

});
export const SfaAchievementDetailUpdateSchema = z.object({

});
export const SfaActivitySchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaActivityCreateSchema = z.object({

});
export const SfaActivityUpdateSchema = z.object({

});
export const SfaApprovalRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaApprovalRequestCreateSchema = z.object({

});
export const SfaApprovalRequestUpdateSchema = z.object({

});
export const SfaApprovalStepSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaApprovalStepCreateSchema = z.object({

});
export const SfaApprovalStepUpdateSchema = z.object({

});
export const SfaApprovalWorkflowSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaApprovalWorkflowCreateSchema = z.object({

});
export const SfaApprovalWorkflowUpdateSchema = z.object({

});
export const SfaCommissionGroupSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaCommissionGroupCreateSchema = z.object({

});
export const SfaCommissionGroupUpdateSchema = z.object({

});
export const SfaCommissionGroupProductSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaCommissionGroupProductCreateSchema = z.object({

});
export const SfaCommissionGroupProductUpdateSchema = z.object({

});
export const SfaCompetitorActivitySchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaCompetitorActivityCreateSchema = z.object({

});
export const SfaCompetitorActivityUpdateSchema = z.object({

});
export const SfaCoverageAssignmentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaCoverageAssignmentCreateSchema = z.object({

});
export const SfaCoverageAssignmentUpdateSchema = z.object({

});
export const SfaCoveragePlanSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaCoveragePlanCreateSchema = z.object({

});
export const SfaCoveragePlanUpdateSchema = z.object({

});
export const SfaDisplayAuditSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaDisplayAuditCreateSchema = z.object({

});
export const SfaDisplayAuditUpdateSchema = z.object({

});
export const SfaDisplayItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaDisplayItemCreateSchema = z.object({

});
export const SfaDisplayItemUpdateSchema = z.object({

});
export const SfaFieldOrderSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaFieldOrderCreateSchema = z.object({

});
export const SfaFieldOrderUpdateSchema = z.object({

});
export const SfaFieldOrderItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaFieldOrderItemCreateSchema = z.object({

});
export const SfaFieldOrderItemUpdateSchema = z.object({

});
export const SfaGeofenceSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaGeofenceCreateSchema = z.object({

});
export const SfaGeofenceUpdateSchema = z.object({

});
export const SfaIncentiveCalculationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaIncentiveCalculationCreateSchema = z.object({

});
export const SfaIncentiveCalculationUpdateSchema = z.object({

});
export const SfaIncentiveSchemeSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaIncentiveSchemeCreateSchema = z.object({

});
export const SfaIncentiveSchemeUpdateSchema = z.object({

});
export const SfaIncentiveTierSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaIncentiveTierCreateSchema = z.object({

});
export const SfaIncentiveTierUpdateSchema = z.object({

});
export const SfaLeadSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaLeadCreateSchema = z.object({

});
export const SfaLeadUpdateSchema = z.object({

});
export const SfaOpportunitySchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaOpportunityCreateSchema = z.object({

});
export const SfaOpportunityUpdateSchema = z.object({

});
export const SfaOutletTargetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaOutletTargetCreateSchema = z.object({

});
export const SfaOutletTargetUpdateSchema = z.object({

});
export const SfaParameterSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaParameterCreateSchema = z.object({

});
export const SfaParameterUpdateSchema = z.object({

});
export const SfaPlafonSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaPlafonCreateSchema = z.object({

});
export const SfaPlafonUpdateSchema = z.object({

});
export const SfaPlafonUsageSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaPlafonUsageCreateSchema = z.object({

});
export const SfaPlafonUsageUpdateSchema = z.object({

});
export const SfaProductCommissionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaProductCommissionCreateSchema = z.object({

});
export const SfaProductCommissionUpdateSchema = z.object({

});
export const SfaQuotationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaQuotationCreateSchema = z.object({

});
export const SfaQuotationUpdateSchema = z.object({

});
export const SfaQuotationItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaQuotationItemCreateSchema = z.object({

});
export const SfaQuotationItemUpdateSchema = z.object({

});
export const SfaRoutePlanSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaRoutePlanCreateSchema = z.object({

});
export const SfaRoutePlanUpdateSchema = z.object({

});
export const SfaSalesStrategySchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaSalesStrategyCreateSchema = z.object({

});
export const SfaSalesStrategyUpdateSchema = z.object({

});
export const SfaStrategyKpiSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaStrategyKpiCreateSchema = z.object({

});
export const SfaStrategyKpiUpdateSchema = z.object({

});
export const SfaSurveyQuestionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaSurveyQuestionCreateSchema = z.object({

});
export const SfaSurveyQuestionUpdateSchema = z.object({

});
export const SfaSurveyResponseSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaSurveyResponseCreateSchema = z.object({

});
export const SfaSurveyResponseUpdateSchema = z.object({

});
export const SfaSurveyTemplateSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaSurveyTemplateCreateSchema = z.object({

});
export const SfaSurveyTemplateUpdateSchema = z.object({

});
export const SfaTargetSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaTargetCreateSchema = z.object({

});
export const SfaTargetUpdateSchema = z.object({

});
export const SfaTargetAssignmentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaTargetAssignmentCreateSchema = z.object({

});
export const SfaTargetAssignmentUpdateSchema = z.object({

});
export const SfaTargetGroupSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaTargetGroupCreateSchema = z.object({

});
export const SfaTargetGroupUpdateSchema = z.object({

});
export const SfaTargetProductSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaTargetProductCreateSchema = z.object({

});
export const SfaTargetProductUpdateSchema = z.object({

});
export const SfaTeamSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaTeamCreateSchema = z.object({

});
export const SfaTeamUpdateSchema = z.object({

});
export const SfaTeamMemberSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaTeamMemberCreateSchema = z.object({

});
export const SfaTeamMemberUpdateSchema = z.object({

});
export const SfaTerritorySchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaTerritoryCreateSchema = z.object({

});
export const SfaTerritoryUpdateSchema = z.object({

});
export const SfaVisitSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SfaVisitCreateSchema = z.object({

});
export const SfaVisitUpdateSchema = z.object({

});
export const ShiftSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ShiftCreateSchema = z.object({

});
export const ShiftUpdateSchema = z.object({

});
export const ShiftHandoverSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ShiftHandoverCreateSchema = z.object({

});
export const ShiftHandoverUpdateSchema = z.object({

});
export const ShiftRotationSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ShiftRotationCreateSchema = z.object({

});
export const ShiftRotationUpdateSchema = z.object({

});
export const ShiftScheduleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ShiftScheduleCreateSchema = z.object({

});
export const ShiftScheduleUpdateSchema = z.object({

});
export const ShiftTemplateSchema = z.object({
  id: z.string().uuid().nullish()
});
export const ShiftTemplateCreateSchema = z.object({

});
export const ShiftTemplateUpdateSchema = z.object({

});
export const StockSchema = z.object({
  id: z.number().int().nullish()
});
export const StockCreateSchema = z.object({

});
export const StockUpdateSchema = z.object({

});
export const StockAdjustmentSchema = z.object({
  id: z.string().uuid().nullish()
});
export const StockAdjustmentCreateSchema = z.object({

});
export const StockAdjustmentUpdateSchema = z.object({

});
export const StockAdjustmentItemSchema = z.object({
  id: z.string().uuid().nullish()
});
export const StockAdjustmentItemCreateSchema = z.object({

});
export const StockAdjustmentItemUpdateSchema = z.object({

});
export const StockMovementSchema = z.object({
  id: z.string().uuid().nullish()
});
export const StockMovementCreateSchema = z.object({

});
export const StockMovementUpdateSchema = z.object({

});
export const StockOpnameSchema = z.object({
  id: z.number().int().nullish()
});
export const StockOpnameCreateSchema = z.object({

});
export const StockOpnameUpdateSchema = z.object({

});
export const StockOpnameItemSchema = z.object({
  id: z.number().int().nullish()
});
export const StockOpnameItemCreateSchema = z.object({

});
export const StockOpnameItemUpdateSchema = z.object({

});
export const StoreSchema = z.object({
  id: z.string().uuid().nullish()
});
export const StoreCreateSchema = z.object({

});
export const StoreUpdateSchema = z.object({

});
export const StoreSettingSchema = z.object({
  id: z.string().uuid().nullish()
});
export const StoreSettingCreateSchema = z.object({

});
export const StoreSettingUpdateSchema = z.object({

});
export const SubscriptionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SubscriptionCreateSchema = z.object({

});
export const SubscriptionUpdateSchema = z.object({

});
export const SubscriptionPackageSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SubscriptionPackageCreateSchema = z.object({

});
export const SubscriptionPackageUpdateSchema = z.object({

});
export const SupplierSchema = z.object({
  id: z.number().int().nullish()
});
export const SupplierCreateSchema = z.object({

});
export const SupplierUpdateSchema = z.object({

});
export const SurveySchema = z.object({
  id: z.string().uuid().nullish()
});
export const SurveyCreateSchema = z.object({

});
export const SurveyUpdateSchema = z.object({

});
export const SurveyResponseSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SurveyResponseCreateSchema = z.object({

});
export const SurveyResponseUpdateSchema = z.object({

});
export const SyncLogSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SyncLogCreateSchema = z.object({

});
export const SyncLogUpdateSchema = z.object({

});
export const SystemAlertSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SystemAlertCreateSchema = z.object({

});
export const SystemAlertUpdateSchema = z.object({

});
export const SystemBackupSchema = z.object({
  id: z.string().uuid().nullish()
});
export const SystemBackupCreateSchema = z.object({

});
export const SystemBackupUpdateSchema = z.object({

});
export const TableSchema = z.object({
  id: z.string().uuid().nullish()
});
export const TableCreateSchema = z.object({

});
export const TableUpdateSchema = z.object({

});
export const TableSessionSchema = z.object({
  id: z.string().uuid().nullish()
});
export const TableSessionCreateSchema = z.object({

});
export const TableSessionUpdateSchema = z.object({

});
export const TenantSchema = z.object({
  id: z.string().uuid().nullish()
});
export const TenantCreateSchema = z.object({

});
export const TenantUpdateSchema = z.object({

});
export const TenantModuleSchema = z.object({
  id: z.string().uuid().nullish()
});
export const TenantModuleCreateSchema = z.object({

});
export const TenantModuleUpdateSchema = z.object({

});
export const TerminationRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const TerminationRequestCreateSchema = z.object({

});
export const TerminationRequestUpdateSchema = z.object({

});
export const TravelExpenseSchema = z.object({
  id: z.string().uuid().nullish()
});
export const TravelExpenseCreateSchema = z.object({

});
export const TravelExpenseUpdateSchema = z.object({

});
export const TravelRequestSchema = z.object({
  id: z.string().uuid().nullish()
});
export const TravelRequestCreateSchema = z.object({

});
export const TravelRequestUpdateSchema = z.object({

});
export const UnitSchema = z.object({
  id: z.string().uuid().nullish()
});
export const UnitCreateSchema = z.object({

});
export const UnitUpdateSchema = z.object({

});
export const UsageMetricSchema = z.object({
  id: z.string().uuid().nullish()
});
export const UsageMetricCreateSchema = z.object({

});
export const UsageMetricUpdateSchema = z.object({

});
export const UserSchema = z.object({
  id: z.number().int().nullish()
});
export const UserCreateSchema = z.object({

});
export const UserUpdateSchema = z.object({

});
export const VoucherSchema = z.object({
  id: z.string().uuid().nullish()
});
export const VoucherCreateSchema = z.object({

});
export const VoucherUpdateSchema = z.object({

});
export const WarehouseSchema = z.object({
  id: z.number().int().nullish()
});
export const WarehouseCreateSchema = z.object({

});
export const WarehouseUpdateSchema = z.object({

});
export const WarningLetterSchema = z.object({
  id: z.string().uuid().nullish()
});
export const WarningLetterCreateSchema = z.object({

});
export const WarningLetterUpdateSchema = z.object({

});
export const WebhookSchema = z.object({
  id: z.string().uuid().nullish()
});
export const WebhookCreateSchema = z.object({

});
export const WebhookUpdateSchema = z.object({

});
export const WorkShiftSchema = z.object({
  id: z.string().uuid().nullish()
});
export const WorkShiftCreateSchema = z.object({

});
export const WorkShiftUpdateSchema = z.object({

});
export const WasteSchema = z.object({
  id: z.number().int().nullish()
});
export const WasteCreateSchema = z.object({

});
export const WasteUpdateSchema = z.object({

});

// ============================================================
// TYPE INFERENCES
// ============================================================

export type ActivationRequest = z.infer<typeof ActivationRequestSchema>;
export type ActivationRequestCreate = z.infer<typeof ActivationRequestCreateSchema>;
export type ActivationRequestUpdate = z.infer<typeof ActivationRequestUpdateSchema>;
export type AlertAction = z.infer<typeof AlertActionSchema>;
export type AlertActionCreate = z.infer<typeof AlertActionCreateSchema>;
export type AlertActionUpdate = z.infer<typeof AlertActionUpdateSchema>;
export type AlertSubscription = z.infer<typeof AlertSubscriptionSchema>;
export type AlertSubscriptionCreate = z.infer<typeof AlertSubscriptionCreateSchema>;
export type AlertSubscriptionUpdate = z.infer<typeof AlertSubscriptionUpdateSchema>;
export type Announcement = z.infer<typeof AnnouncementSchema>;
export type AnnouncementCreate = z.infer<typeof AnnouncementCreateSchema>;
export type AnnouncementUpdate = z.infer<typeof AnnouncementUpdateSchema>;
export type Asset = z.infer<typeof AssetSchema>;
export type AssetCreate = z.infer<typeof AssetCreateSchema>;
export type AssetUpdate = z.infer<typeof AssetUpdateSchema>;
export type AssetCategory = z.infer<typeof AssetCategorySchema>;
export type AssetCategoryCreate = z.infer<typeof AssetCategoryCreateSchema>;
export type AssetCategoryUpdate = z.infer<typeof AssetCategoryUpdateSchema>;
export type AssetLicense = z.infer<typeof AssetLicenseSchema>;
export type AssetLicenseCreate = z.infer<typeof AssetLicenseCreateSchema>;
export type AssetLicenseUpdate = z.infer<typeof AssetLicenseUpdateSchema>;
export type AssetMaintenanceSchedule = z.infer<typeof AssetMaintenanceScheduleSchema>;
export type AssetMaintenanceScheduleCreate = z.infer<typeof AssetMaintenanceScheduleCreateSchema>;
export type AssetMaintenanceScheduleUpdate = z.infer<typeof AssetMaintenanceScheduleUpdateSchema>;
export type AssetMovement = z.infer<typeof AssetMovementSchema>;
export type AssetMovementCreate = z.infer<typeof AssetMovementCreateSchema>;
export type AssetMovementUpdate = z.infer<typeof AssetMovementUpdateSchema>;
export type AssetTenancy = z.infer<typeof AssetTenancySchema>;
export type AssetTenancyCreate = z.infer<typeof AssetTenancyCreateSchema>;
export type AssetTenancyUpdate = z.infer<typeof AssetTenancyUpdateSchema>;
export type AssetWorkOrder = z.infer<typeof AssetWorkOrderSchema>;
export type AssetWorkOrderCreate = z.infer<typeof AssetWorkOrderCreateSchema>;
export type AssetWorkOrderUpdate = z.infer<typeof AssetWorkOrderUpdateSchema>;
export type AttendanceDevice = z.infer<typeof AttendanceDeviceSchema>;
export type AttendanceDeviceCreate = z.infer<typeof AttendanceDeviceCreateSchema>;
export type AttendanceDeviceUpdate = z.infer<typeof AttendanceDeviceUpdateSchema>;
export type AttendanceDeviceLog = z.infer<typeof AttendanceDeviceLogSchema>;
export type AttendanceDeviceLogCreate = z.infer<typeof AttendanceDeviceLogCreateSchema>;
export type AttendanceDeviceLogUpdate = z.infer<typeof AttendanceDeviceLogUpdateSchema>;
export type AttendanceSetting = z.infer<typeof AttendanceSettingSchema>;
export type AttendanceSettingCreate = z.infer<typeof AttendanceSettingCreateSchema>;
export type AttendanceSettingUpdate = z.infer<typeof AttendanceSettingUpdateSchema>;
export type AttendanceSettings = z.infer<typeof AttendanceSettingsSchema>;
export type AttendanceSettingsCreate = z.infer<typeof AttendanceSettingsCreateSchema>;
export type AttendanceSettingsUpdate = z.infer<typeof AttendanceSettingsUpdateSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AuditLogCreate = z.infer<typeof AuditLogCreateSchema>;
export type AuditLogUpdate = z.infer<typeof AuditLogUpdateSchema>;
export type BillingCycle = z.infer<typeof BillingCycleSchema>;
export type BillingCycleCreate = z.infer<typeof BillingCycleCreateSchema>;
export type BillingCycleUpdate = z.infer<typeof BillingCycleUpdateSchema>;
export type Branch = z.infer<typeof BranchSchema>;
export type BranchCreate = z.infer<typeof BranchCreateSchema>;
export type BranchUpdate = z.infer<typeof BranchUpdateSchema>;
export type BranchModule = z.infer<typeof BranchModuleSchema>;
export type BranchModuleCreate = z.infer<typeof BranchModuleCreateSchema>;
export type BranchModuleUpdate = z.infer<typeof BranchModuleUpdateSchema>;
export type BranchRealTimeMetrics = z.infer<typeof BranchRealTimeMetricsSchema>;
export type BranchRealTimeMetricsCreate = z.infer<typeof BranchRealTimeMetricsCreateSchema>;
export type BranchRealTimeMetricsUpdate = z.infer<typeof BranchRealTimeMetricsUpdateSchema>;
export type BranchSetup = z.infer<typeof BranchSetupSchema>;
export type BranchSetupCreate = z.infer<typeof BranchSetupCreateSchema>;
export type BranchSetupUpdate = z.infer<typeof BranchSetupUpdateSchema>;
export type BusinessType = z.infer<typeof BusinessTypeSchema>;
export type BusinessTypeCreate = z.infer<typeof BusinessTypeCreateSchema>;
export type BusinessTypeUpdate = z.infer<typeof BusinessTypeUpdateSchema>;
export type BusinessTypeModule = z.infer<typeof BusinessTypeModuleSchema>;
export type BusinessTypeModuleCreate = z.infer<typeof BusinessTypeModuleCreateSchema>;
export type BusinessTypeModuleUpdate = z.infer<typeof BusinessTypeModuleUpdateSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;
export type CompanyRegulation = z.infer<typeof CompanyRegulationSchema>;
export type CompanyRegulationCreate = z.infer<typeof CompanyRegulationCreateSchema>;
export type CompanyRegulationUpdate = z.infer<typeof CompanyRegulationUpdateSchema>;
export type ComplianceChecklist = z.infer<typeof ComplianceChecklistSchema>;
export type ComplianceChecklistCreate = z.infer<typeof ComplianceChecklistCreateSchema>;
export type ComplianceChecklistUpdate = z.infer<typeof ComplianceChecklistUpdateSchema>;
export type ContractReminder = z.infer<typeof ContractReminderSchema>;
export type ContractReminderCreate = z.infer<typeof ContractReminderCreateSchema>;
export type ContractReminderUpdate = z.infer<typeof ContractReminderUpdateSchema>;
export type CrmAutomationLog = z.infer<typeof CrmAutomationLogSchema>;
export type CrmAutomationLogCreate = z.infer<typeof CrmAutomationLogCreateSchema>;
export type CrmAutomationLogUpdate = z.infer<typeof CrmAutomationLogUpdateSchema>;
export type CrmAutomationRule = z.infer<typeof CrmAutomationRuleSchema>;
export type CrmAutomationRuleCreate = z.infer<typeof CrmAutomationRuleCreateSchema>;
export type CrmAutomationRuleUpdate = z.infer<typeof CrmAutomationRuleUpdateSchema>;
export type CrmCalendarEvent = z.infer<typeof CrmCalendarEventSchema>;
export type CrmCalendarEventCreate = z.infer<typeof CrmCalendarEventCreateSchema>;
export type CrmCalendarEventUpdate = z.infer<typeof CrmCalendarEventUpdateSchema>;
export type CrmCommCampaign = z.infer<typeof CrmCommCampaignSchema>;
export type CrmCommCampaignCreate = z.infer<typeof CrmCommCampaignCreateSchema>;
export type CrmCommCampaignUpdate = z.infer<typeof CrmCommCampaignUpdateSchema>;
export type CrmCommunication = z.infer<typeof CrmCommunicationSchema>;
export type CrmCommunicationCreate = z.infer<typeof CrmCommunicationCreateSchema>;
export type CrmCommunicationUpdate = z.infer<typeof CrmCommunicationUpdateSchema>;
export type CrmContact = z.infer<typeof CrmContactSchema>;
export type CrmContactCreate = z.infer<typeof CrmContactCreateSchema>;
export type CrmContactUpdate = z.infer<typeof CrmContactUpdateSchema>;
export type CrmCustomDashboard = z.infer<typeof CrmCustomDashboardSchema>;
export type CrmCustomDashboardCreate = z.infer<typeof CrmCustomDashboardCreateSchema>;
export type CrmCustomDashboardUpdate = z.infer<typeof CrmCustomDashboardUpdateSchema>;
export type CrmCustomer = z.infer<typeof CrmCustomerSchema>;
export type CrmCustomerCreate = z.infer<typeof CrmCustomerCreateSchema>;
export type CrmCustomerUpdate = z.infer<typeof CrmCustomerUpdateSchema>;
export type CrmCustomerSegment = z.infer<typeof CrmCustomerSegmentSchema>;
export type CrmCustomerSegmentCreate = z.infer<typeof CrmCustomerSegmentCreateSchema>;
export type CrmCustomerSegmentUpdate = z.infer<typeof CrmCustomerSegmentUpdateSchema>;
export type CrmCustomerTag = z.infer<typeof CrmCustomerTagSchema>;
export type CrmCustomerTagCreate = z.infer<typeof CrmCustomerTagCreateSchema>;
export type CrmCustomerTagUpdate = z.infer<typeof CrmCustomerTagUpdateSchema>;
export type CrmDealScore = z.infer<typeof CrmDealScoreSchema>;
export type CrmDealScoreCreate = z.infer<typeof CrmDealScoreCreateSchema>;
export type CrmDealScoreUpdate = z.infer<typeof CrmDealScoreUpdateSchema>;
export type CrmDocument = z.infer<typeof CrmDocumentSchema>;
export type CrmDocumentCreate = z.infer<typeof CrmDocumentCreateSchema>;
export type CrmDocumentUpdate = z.infer<typeof CrmDocumentUpdateSchema>;
export type CrmDocumentTemplate = z.infer<typeof CrmDocumentTemplateSchema>;
export type CrmDocumentTemplateCreate = z.infer<typeof CrmDocumentTemplateCreateSchema>;
export type CrmDocumentTemplateUpdate = z.infer<typeof CrmDocumentTemplateUpdateSchema>;
export type CrmEmailTemplate = z.infer<typeof CrmEmailTemplateSchema>;
export type CrmEmailTemplateCreate = z.infer<typeof CrmEmailTemplateCreateSchema>;
export type CrmEmailTemplateUpdate = z.infer<typeof CrmEmailTemplateUpdateSchema>;
export type CrmFollowUp = z.infer<typeof CrmFollowUpSchema>;
export type CrmFollowUpCreate = z.infer<typeof CrmFollowUpCreateSchema>;
export type CrmFollowUpUpdate = z.infer<typeof CrmFollowUpUpdateSchema>;
export type CrmForecast = z.infer<typeof CrmForecastSchema>;
export type CrmForecastCreate = z.infer<typeof CrmForecastCreateSchema>;
export type CrmForecastUpdate = z.infer<typeof CrmForecastUpdateSchema>;
export type CrmForecastItem = z.infer<typeof CrmForecastItemSchema>;
export type CrmForecastItemCreate = z.infer<typeof CrmForecastItemCreateSchema>;
export type CrmForecastItemUpdate = z.infer<typeof CrmForecastItemUpdateSchema>;
export type CrmInteraction = z.infer<typeof CrmInteractionSchema>;
export type CrmInteractionCreate = z.infer<typeof CrmInteractionCreateSchema>;
export type CrmInteractionUpdate = z.infer<typeof CrmInteractionUpdateSchema>;
export type CrmSatisfaction = z.infer<typeof CrmSatisfactionSchema>;
export type CrmSatisfactionCreate = z.infer<typeof CrmSatisfactionCreateSchema>;
export type CrmSatisfactionUpdate = z.infer<typeof CrmSatisfactionUpdateSchema>;
export type CrmSavedReport = z.infer<typeof CrmSavedReportSchema>;
export type CrmSavedReportCreate = z.infer<typeof CrmSavedReportCreateSchema>;
export type CrmSavedReportUpdate = z.infer<typeof CrmSavedReportUpdateSchema>;
export type CrmSlaPolicy = z.infer<typeof CrmSlaPolicySchema>;
export type CrmSlaPolicyCreate = z.infer<typeof CrmSlaPolicyCreateSchema>;
export type CrmSlaPolicyUpdate = z.infer<typeof CrmSlaPolicyUpdateSchema>;
export type CrmTask = z.infer<typeof CrmTaskSchema>;
export type CrmTaskCreate = z.infer<typeof CrmTaskCreateSchema>;
export type CrmTaskUpdate = z.infer<typeof CrmTaskUpdateSchema>;
export type CrmTaskTemplate = z.infer<typeof CrmTaskTemplateSchema>;
export type CrmTaskTemplateCreate = z.infer<typeof CrmTaskTemplateCreateSchema>;
export type CrmTaskTemplateUpdate = z.infer<typeof CrmTaskTemplateUpdateSchema>;
export type CrmTicket = z.infer<typeof CrmTicketSchema>;
export type CrmTicketCreate = z.infer<typeof CrmTicketCreateSchema>;
export type CrmTicketUpdate = z.infer<typeof CrmTicketUpdateSchema>;
export type CrmTicketComment = z.infer<typeof CrmTicketCommentSchema>;
export type CrmTicketCommentCreate = z.infer<typeof CrmTicketCommentCreateSchema>;
export type CrmTicketCommentUpdate = z.infer<typeof CrmTicketCommentUpdateSchema>;
export type Customer = z.infer<typeof CustomerSchema>;
export type CustomerCreate = z.infer<typeof CustomerCreateSchema>;
export type CustomerUpdate = z.infer<typeof CustomerUpdateSchema>;
export type CustomerLoyalty = z.infer<typeof CustomerLoyaltySchema>;
export type CustomerLoyaltyCreate = z.infer<typeof CustomerLoyaltyCreateSchema>;
export type CustomerLoyaltyUpdate = z.infer<typeof CustomerLoyaltyUpdateSchema>;
export type DmsAccessLog = z.infer<typeof DmsAccessLogSchema>;
export type DmsAccessLogCreate = z.infer<typeof DmsAccessLogCreateSchema>;
export type DmsAccessLogUpdate = z.infer<typeof DmsAccessLogUpdateSchema>;
export type DmsDisposalBatch = z.infer<typeof DmsDisposalBatchSchema>;
export type DmsDisposalBatchCreate = z.infer<typeof DmsDisposalBatchCreateSchema>;
export type DmsDisposalBatchUpdate = z.infer<typeof DmsDisposalBatchUpdateSchema>;
export type DmsDisposition = z.infer<typeof DmsDispositionSchema>;
export type DmsDispositionCreate = z.infer<typeof DmsDispositionCreateSchema>;
export type DmsDispositionUpdate = z.infer<typeof DmsDispositionUpdateSchema>;
export type DmsFile = z.infer<typeof DmsFileSchema>;
export type DmsFileCreate = z.infer<typeof DmsFileCreateSchema>;
export type DmsFileUpdate = z.infer<typeof DmsFileUpdateSchema>;
export type DmsFolder = z.infer<typeof DmsFolderSchema>;
export type DmsFolderCreate = z.infer<typeof DmsFolderCreateSchema>;
export type DmsFolderUpdate = z.infer<typeof DmsFolderUpdateSchema>;
export type DmsHierarchyNode = z.infer<typeof DmsHierarchyNodeSchema>;
export type DmsHierarchyNodeCreate = z.infer<typeof DmsHierarchyNodeCreateSchema>;
export type DmsHierarchyNodeUpdate = z.infer<typeof DmsHierarchyNodeUpdateSchema>;
export type DmsKnowledgeEdge = z.infer<typeof DmsKnowledgeEdgeSchema>;
export type DmsKnowledgeEdgeCreate = z.infer<typeof DmsKnowledgeEdgeCreateSchema>;
export type DmsKnowledgeEdgeUpdate = z.infer<typeof DmsKnowledgeEdgeUpdateSchema>;
export type DmsLetter = z.infer<typeof DmsLetterSchema>;
export type DmsLetterCreate = z.infer<typeof DmsLetterCreateSchema>;
export type DmsLetterUpdate = z.infer<typeof DmsLetterUpdateSchema>;
export type DmsMataElangShare = z.infer<typeof DmsMataElangShareSchema>;
export type DmsMataElangShareCreate = z.infer<typeof DmsMataElangShareCreateSchema>;
export type DmsMataElangShareUpdate = z.infer<typeof DmsMataElangShareUpdateSchema>;
export type DmsOpenDataset = z.infer<typeof DmsOpenDatasetSchema>;
export type DmsOpenDatasetCreate = z.infer<typeof DmsOpenDatasetCreateSchema>;
export type DmsOpenDatasetUpdate = z.infer<typeof DmsOpenDatasetUpdateSchema>;
export type DmsPpidRequest = z.infer<typeof DmsPpidRequestSchema>;
export type DmsPpidRequestCreate = z.infer<typeof DmsPpidRequestCreateSchema>;
export type DmsPpidRequestUpdate = z.infer<typeof DmsPpidRequestUpdateSchema>;
export type DmsRecordsClassification = z.infer<typeof DmsRecordsClassificationSchema>;
export type DmsRecordsClassificationCreate = z.infer<typeof DmsRecordsClassificationCreateSchema>;
export type DmsRecordsClassificationUpdate = z.infer<typeof DmsRecordsClassificationUpdateSchema>;
export type DmsRetentionPolicy = z.infer<typeof DmsRetentionPolicySchema>;
export type DmsRetentionPolicyCreate = z.infer<typeof DmsRetentionPolicyCreateSchema>;
export type DmsRetentionPolicyUpdate = z.infer<typeof DmsRetentionPolicyUpdateSchema>;
export type DmsSignature = z.infer<typeof DmsSignatureSchema>;
export type DmsSignatureCreate = z.infer<typeof DmsSignatureCreateSchema>;
export type DmsSignatureUpdate = z.infer<typeof DmsSignatureUpdateSchema>;
export type Employee = z.infer<typeof EmployeeSchema>;
export type EmployeeCreate = z.infer<typeof EmployeeCreateSchema>;
export type EmployeeUpdate = z.infer<typeof EmployeeUpdateSchema>;
export type EmployeeAttendance = z.infer<typeof EmployeeAttendanceSchema>;
export type EmployeeAttendanceCreate = z.infer<typeof EmployeeAttendanceCreateSchema>;
export type EmployeeAttendanceUpdate = z.infer<typeof EmployeeAttendanceUpdateSchema>;
export type EmployeeCertification = z.infer<typeof EmployeeCertificationSchema>;
export type EmployeeCertificationCreate = z.infer<typeof EmployeeCertificationCreateSchema>;
export type EmployeeCertificationUpdate = z.infer<typeof EmployeeCertificationUpdateSchema>;
export type EmployeeClaim = z.infer<typeof EmployeeClaimSchema>;
export type EmployeeClaimCreate = z.infer<typeof EmployeeClaimCreateSchema>;
export type EmployeeClaimUpdate = z.infer<typeof EmployeeClaimUpdateSchema>;
export type EmployeeContract = z.infer<typeof EmployeeContractSchema>;
export type EmployeeContractCreate = z.infer<typeof EmployeeContractCreateSchema>;
export type EmployeeContractUpdate = z.infer<typeof EmployeeContractUpdateSchema>;
export type EmployeeDocument = z.infer<typeof EmployeeDocumentSchema>;
export type EmployeeDocumentCreate = z.infer<typeof EmployeeDocumentCreateSchema>;
export type EmployeeDocumentUpdate = z.infer<typeof EmployeeDocumentUpdateSchema>;
export type EmployeeEducation = z.infer<typeof EmployeeEducationSchema>;
export type EmployeeEducationCreate = z.infer<typeof EmployeeEducationCreateSchema>;
export type EmployeeEducationUpdate = z.infer<typeof EmployeeEducationUpdateSchema>;
export type EmployeeFamily = z.infer<typeof EmployeeFamilySchema>;
export type EmployeeFamilyCreate = z.infer<typeof EmployeeFamilyCreateSchema>;
export type EmployeeFamilyUpdate = z.infer<typeof EmployeeFamilyUpdateSchema>;
export type EmployeeKPI = z.infer<typeof EmployeeKPISchema>;
export type EmployeeKPICreate = z.infer<typeof EmployeeKPICreateSchema>;
export type EmployeeKPIUpdate = z.infer<typeof EmployeeKPIUpdateSchema>;
export type EmployeeMutation = z.infer<typeof EmployeeMutationSchema>;
export type EmployeeMutationCreate = z.infer<typeof EmployeeMutationCreateSchema>;
export type EmployeeMutationUpdate = z.infer<typeof EmployeeMutationUpdateSchema>;
export type EmployeeSalary = z.infer<typeof EmployeeSalarySchema>;
export type EmployeeSalaryCreate = z.infer<typeof EmployeeSalaryCreateSchema>;
export type EmployeeSalaryUpdate = z.infer<typeof EmployeeSalaryUpdateSchema>;
export type EmployeeSchedule = z.infer<typeof EmployeeScheduleSchema>;
export type EmployeeScheduleCreate = z.infer<typeof EmployeeScheduleCreateSchema>;
export type EmployeeScheduleUpdate = z.infer<typeof EmployeeScheduleUpdateSchema>;
export type EmployeeSkill = z.infer<typeof EmployeeSkillSchema>;
export type EmployeeSkillCreate = z.infer<typeof EmployeeSkillCreateSchema>;
export type EmployeeSkillUpdate = z.infer<typeof EmployeeSkillUpdateSchema>;
export type EmployeeWorkExperience = z.infer<typeof EmployeeWorkExperienceSchema>;
export type EmployeeWorkExperienceCreate = z.infer<typeof EmployeeWorkExperienceCreateSchema>;
export type EmployeeWorkExperienceUpdate = z.infer<typeof EmployeeWorkExperienceUpdateSchema>;
export type EprContract = z.infer<typeof EprContractSchema>;
export type EprContractCreate = z.infer<typeof EprContractCreateSchema>;
export type EprContractUpdate = z.infer<typeof EprContractUpdateSchema>;
export type EprEvaluation = z.infer<typeof EprEvaluationSchema>;
export type EprEvaluationCreate = z.infer<typeof EprEvaluationCreateSchema>;
export type EprEvaluationUpdate = z.infer<typeof EprEvaluationUpdateSchema>;
export type EprProcurementRequest = z.infer<typeof EprProcurementRequestSchema>;
export type EprProcurementRequestCreate = z.infer<typeof EprProcurementRequestCreateSchema>;
export type EprProcurementRequestUpdate = z.infer<typeof EprProcurementRequestUpdateSchema>;
export type EprRfq = z.infer<typeof EprRfqSchema>;
export type EprRfqCreate = z.infer<typeof EprRfqCreateSchema>;
export type EprRfqUpdate = z.infer<typeof EprRfqUpdateSchema>;
export type EprRfqItem = z.infer<typeof EprRfqItemSchema>;
export type EprRfqItemCreate = z.infer<typeof EprRfqItemCreateSchema>;
export type EprRfqItemUpdate = z.infer<typeof EprRfqItemUpdateSchema>;
export type EprRfqResponse = z.infer<typeof EprRfqResponseSchema>;
export type EprRfqResponseCreate = z.infer<typeof EprRfqResponseCreateSchema>;
export type EprRfqResponseUpdate = z.infer<typeof EprRfqResponseUpdateSchema>;
export type EprSetting = z.infer<typeof EprSettingSchema>;
export type EprSettingCreate = z.infer<typeof EprSettingCreateSchema>;
export type EprSettingUpdate = z.infer<typeof EprSettingUpdateSchema>;
export type EprTender = z.infer<typeof EprTenderSchema>;
export type EprTenderCreate = z.infer<typeof EprTenderCreateSchema>;
export type EprTenderUpdate = z.infer<typeof EprTenderUpdateSchema>;
export type EprTenderBid = z.infer<typeof EprTenderBidSchema>;
export type EprTenderBidCreate = z.infer<typeof EprTenderBidCreateSchema>;
export type EprTenderBidUpdate = z.infer<typeof EprTenderBidUpdateSchema>;
export type EprVendor = z.infer<typeof EprVendorSchema>;
export type EprVendorCreate = z.infer<typeof EprVendorCreateSchema>;
export type EprVendorUpdate = z.infer<typeof EprVendorUpdateSchema>;
export type EximContainer = z.infer<typeof EximContainerSchema>;
export type EximContainerCreate = z.infer<typeof EximContainerCreateSchema>;
export type EximContainerUpdate = z.infer<typeof EximContainerUpdateSchema>;
export type EximCost = z.infer<typeof EximCostSchema>;
export type EximCostCreate = z.infer<typeof EximCostCreateSchema>;
export type EximCostUpdate = z.infer<typeof EximCostUpdateSchema>;
export type EximCustoms = z.infer<typeof EximCustomsSchema>;
export type EximCustomsCreate = z.infer<typeof EximCustomsCreateSchema>;
export type EximCustomsUpdate = z.infer<typeof EximCustomsUpdateSchema>;
export type EximDocument = z.infer<typeof EximDocumentSchema>;
export type EximDocumentCreate = z.infer<typeof EximDocumentCreateSchema>;
export type EximDocumentUpdate = z.infer<typeof EximDocumentUpdateSchema>;
export type EximHsCode = z.infer<typeof EximHsCodeSchema>;
export type EximHsCodeCreate = z.infer<typeof EximHsCodeCreateSchema>;
export type EximHsCodeUpdate = z.infer<typeof EximHsCodeUpdateSchema>;
export type EximLC = z.infer<typeof EximLCSchema>;
export type EximLCCreate = z.infer<typeof EximLCCreateSchema>;
export type EximLCUpdate = z.infer<typeof EximLCUpdateSchema>;
export type EximPartner = z.infer<typeof EximPartnerSchema>;
export type EximPartnerCreate = z.infer<typeof EximPartnerCreateSchema>;
export type EximPartnerUpdate = z.infer<typeof EximPartnerUpdateSchema>;
export type EximSetting = z.infer<typeof EximSettingSchema>;
export type EximSettingCreate = z.infer<typeof EximSettingCreateSchema>;
export type EximSettingUpdate = z.infer<typeof EximSettingUpdateSchema>;
export type EximShipment = z.infer<typeof EximShipmentSchema>;
export type EximShipmentCreate = z.infer<typeof EximShipmentCreateSchema>;
export type EximShipmentUpdate = z.infer<typeof EximShipmentUpdateSchema>;
export type ExpenseBudget = z.infer<typeof ExpenseBudgetSchema>;
export type ExpenseBudgetCreate = z.infer<typeof ExpenseBudgetCreateSchema>;
export type ExpenseBudgetUpdate = z.infer<typeof ExpenseBudgetUpdateSchema>;
export type FinanceAccount = z.infer<typeof FinanceAccountSchema>;
export type FinanceAccountCreate = z.infer<typeof FinanceAccountCreateSchema>;
export type FinanceAccountUpdate = z.infer<typeof FinanceAccountUpdateSchema>;
export type FinanceBudget = z.infer<typeof FinanceBudgetSchema>;
export type FinanceBudgetCreate = z.infer<typeof FinanceBudgetCreateSchema>;
export type FinanceBudgetUpdate = z.infer<typeof FinanceBudgetUpdateSchema>;
export type FinanceInvoice = z.infer<typeof FinanceInvoiceSchema>;
export type FinanceInvoiceCreate = z.infer<typeof FinanceInvoiceCreateSchema>;
export type FinanceInvoiceUpdate = z.infer<typeof FinanceInvoiceUpdateSchema>;
export type FinanceInvoiceItem = z.infer<typeof FinanceInvoiceItemSchema>;
export type FinanceInvoiceItemCreate = z.infer<typeof FinanceInvoiceItemCreateSchema>;
export type FinanceInvoiceItemUpdate = z.infer<typeof FinanceInvoiceItemUpdateSchema>;
export type FinanceInvoicePayment = z.infer<typeof FinanceInvoicePaymentSchema>;
export type FinanceInvoicePaymentCreate = z.infer<typeof FinanceInvoicePaymentCreateSchema>;
export type FinanceInvoicePaymentUpdate = z.infer<typeof FinanceInvoicePaymentUpdateSchema>;
export type FinancePayable = z.infer<typeof FinancePayableSchema>;
export type FinancePayableCreate = z.infer<typeof FinancePayableCreateSchema>;
export type FinancePayableUpdate = z.infer<typeof FinancePayableUpdateSchema>;
export type FinancePayablePayment = z.infer<typeof FinancePayablePaymentSchema>;
export type FinancePayablePaymentCreate = z.infer<typeof FinancePayablePaymentCreateSchema>;
export type FinancePayablePaymentUpdate = z.infer<typeof FinancePayablePaymentUpdateSchema>;
export type FinanceReceivable = z.infer<typeof FinanceReceivableSchema>;
export type FinanceReceivableCreate = z.infer<typeof FinanceReceivableCreateSchema>;
export type FinanceReceivableUpdate = z.infer<typeof FinanceReceivableUpdateSchema>;
export type FinanceReceivablePayment = z.infer<typeof FinanceReceivablePaymentSchema>;
export type FinanceReceivablePaymentCreate = z.infer<typeof FinanceReceivablePaymentCreateSchema>;
export type FinanceReceivablePaymentUpdate = z.infer<typeof FinanceReceivablePaymentUpdateSchema>;
export type FinanceTransaction = z.infer<typeof FinanceTransactionSchema>;
export type FinanceTransactionCreate = z.infer<typeof FinanceTransactionCreateSchema>;
export type FinanceTransactionUpdate = z.infer<typeof FinanceTransactionUpdateSchema>;
export type FleetDeliveryProof = z.infer<typeof FleetDeliveryProofSchema>;
export type FleetDeliveryProofCreate = z.infer<typeof FleetDeliveryProofCreateSchema>;
export type FleetDeliveryProofUpdate = z.infer<typeof FleetDeliveryProofUpdateSchema>;
export type FleetDriver = z.infer<typeof FleetDriverSchema>;
export type FleetDriverCreate = z.infer<typeof FleetDriverCreateSchema>;
export type FleetDriverUpdate = z.infer<typeof FleetDriverUpdateSchema>;
export type FleetDriverExpense = z.infer<typeof FleetDriverExpenseSchema>;
export type FleetDriverExpenseCreate = z.infer<typeof FleetDriverExpenseCreateSchema>;
export type FleetDriverExpenseUpdate = z.infer<typeof FleetDriverExpenseUpdateSchema>;
export type FleetFuelTransaction = z.infer<typeof FleetFuelTransactionSchema>;
export type FleetFuelTransactionCreate = z.infer<typeof FleetFuelTransactionCreateSchema>;
export type FleetFuelTransactionUpdate = z.infer<typeof FleetFuelTransactionUpdateSchema>;
export type FleetGpsLocation = z.infer<typeof FleetGpsLocationSchema>;
export type FleetGpsLocationCreate = z.infer<typeof FleetGpsLocationCreateSchema>;
export type FleetGpsLocationUpdate = z.infer<typeof FleetGpsLocationUpdateSchema>;
export type FleetMaintenanceSchedule = z.infer<typeof FleetMaintenanceScheduleSchema>;
export type FleetMaintenanceScheduleCreate = z.infer<typeof FleetMaintenanceScheduleCreateSchema>;
export type FleetMaintenanceScheduleUpdate = z.infer<typeof FleetMaintenanceScheduleUpdateSchema>;
export type FleetRoute = z.infer<typeof FleetRouteSchema>;
export type FleetRouteCreate = z.infer<typeof FleetRouteCreateSchema>;
export type FleetRouteUpdate = z.infer<typeof FleetRouteUpdateSchema>;
export type FleetRouteAssignment = z.infer<typeof FleetRouteAssignmentSchema>;
export type FleetRouteAssignmentCreate = z.infer<typeof FleetRouteAssignmentCreateSchema>;
export type FleetRouteAssignmentUpdate = z.infer<typeof FleetRouteAssignmentUpdateSchema>;
export type FleetVehicle = z.infer<typeof FleetVehicleSchema>;
export type FleetVehicleCreate = z.infer<typeof FleetVehicleCreateSchema>;
export type FleetVehicleUpdate = z.infer<typeof FleetVehicleUpdateSchema>;
export type FleetVehicleInspection = z.infer<typeof FleetVehicleInspectionSchema>;
export type FleetVehicleInspectionCreate = z.infer<typeof FleetVehicleInspectionCreateSchema>;
export type FleetVehicleInspectionUpdate = z.infer<typeof FleetVehicleInspectionUpdateSchema>;
export type GeofenceLocation = z.infer<typeof GeofenceLocationSchema>;
export type GeofenceLocationCreate = z.infer<typeof GeofenceLocationCreateSchema>;
export type GeofenceLocationUpdate = z.infer<typeof GeofenceLocationUpdateSchema>;
export type GoodsReceipt = z.infer<typeof GoodsReceiptSchema>;
export type GoodsReceiptCreate = z.infer<typeof GoodsReceiptCreateSchema>;
export type GoodsReceiptUpdate = z.infer<typeof GoodsReceiptUpdateSchema>;
export type GoodsReceiptItem = z.infer<typeof GoodsReceiptItemSchema>;
export type GoodsReceiptItemCreate = z.infer<typeof GoodsReceiptItemCreateSchema>;
export type GoodsReceiptItemUpdate = z.infer<typeof GoodsReceiptItemUpdateSchema>;
export type HRISWebhookLog = z.infer<typeof HRISWebhookLogSchema>;
export type HRISWebhookLogCreate = z.infer<typeof HRISWebhookLogCreateSchema>;
export type HRISWebhookLogUpdate = z.infer<typeof HRISWebhookLogUpdateSchema>;
export type HeadcountPlan = z.infer<typeof HeadcountPlanSchema>;
export type HeadcountPlanCreate = z.infer<typeof HeadcountPlanCreateSchema>;
export type HeadcountPlanUpdate = z.infer<typeof HeadcountPlanUpdateSchema>;
export type HeldTransaction = z.infer<typeof HeldTransactionSchema>;
export type HeldTransactionCreate = z.infer<typeof HeldTransactionCreateSchema>;
export type HeldTransactionUpdate = z.infer<typeof HeldTransactionUpdateSchema>;
export type IncidentReport = z.infer<typeof IncidentReportSchema>;
export type IncidentReportCreate = z.infer<typeof IncidentReportCreateSchema>;
export type IncidentReportUpdate = z.infer<typeof IncidentReportUpdateSchema>;
export type IntegrationConfig = z.infer<typeof IntegrationConfigSchema>;
export type IntegrationConfigCreate = z.infer<typeof IntegrationConfigCreateSchema>;
export type IntegrationConfigUpdate = z.infer<typeof IntegrationConfigUpdateSchema>;
export type IntegrationLog = z.infer<typeof IntegrationLogSchema>;
export type IntegrationLogCreate = z.infer<typeof IntegrationLogCreateSchema>;
export type IntegrationLogUpdate = z.infer<typeof IntegrationLogUpdateSchema>;
export type IntegrationProvider = z.infer<typeof IntegrationProviderSchema>;
export type IntegrationProviderCreate = z.infer<typeof IntegrationProviderCreateSchema>;
export type IntegrationProviderUpdate = z.infer<typeof IntegrationProviderUpdateSchema>;
export type IntegrationRequest = z.infer<typeof IntegrationRequestSchema>;
export type IntegrationRequestCreate = z.infer<typeof IntegrationRequestCreateSchema>;
export type IntegrationRequestUpdate = z.infer<typeof IntegrationRequestUpdateSchema>;
export type IntegrationWebhook = z.infer<typeof IntegrationWebhookSchema>;
export type IntegrationWebhookCreate = z.infer<typeof IntegrationWebhookCreateSchema>;
export type IntegrationWebhookUpdate = z.infer<typeof IntegrationWebhookUpdateSchema>;
export type InternalRequisition = z.infer<typeof InternalRequisitionSchema>;
export type InternalRequisitionCreate = z.infer<typeof InternalRequisitionCreateSchema>;
export type InternalRequisitionUpdate = z.infer<typeof InternalRequisitionUpdateSchema>;
export type InternalRequisitionItem = z.infer<typeof InternalRequisitionItemSchema>;
export type InternalRequisitionItemCreate = z.infer<typeof InternalRequisitionItemCreateSchema>;
export type InternalRequisitionItemUpdate = z.infer<typeof InternalRequisitionItemUpdateSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type InvoiceCreate = z.infer<typeof InvoiceCreateSchema>;
export type InvoiceUpdate = z.infer<typeof InvoiceUpdateSchema>;
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type InvoiceItemCreate = z.infer<typeof InvoiceItemCreateSchema>;
export type InvoiceItemUpdate = z.infer<typeof InvoiceItemUpdateSchema>;
export type IrCase = z.infer<typeof IrCaseSchema>;
export type IrCaseCreate = z.infer<typeof IrCaseCreateSchema>;
export type IrCaseUpdate = z.infer<typeof IrCaseUpdateSchema>;
export type JobGrade = z.infer<typeof JobGradeSchema>;
export type JobGradeCreate = z.infer<typeof JobGradeCreateSchema>;
export type JobGradeUpdate = z.infer<typeof JobGradeUpdateSchema>;
export type KPIScoring = z.infer<typeof KPIScoringSchema>;
export type KPIScoringCreate = z.infer<typeof KPIScoringCreateSchema>;
export type KPIScoringUpdate = z.infer<typeof KPIScoringUpdateSchema>;
export type KPITemplate = z.infer<typeof KPITemplateSchema>;
export type KPITemplateCreate = z.infer<typeof KPITemplateCreateSchema>;
export type KPITemplateUpdate = z.infer<typeof KPITemplateUpdateSchema>;
export type KitchenInventoryItem = z.infer<typeof KitchenInventoryItemSchema>;
export type KitchenInventoryItemCreate = z.infer<typeof KitchenInventoryItemCreateSchema>;
export type KitchenInventoryItemUpdate = z.infer<typeof KitchenInventoryItemUpdateSchema>;
export type KitchenInventoryTransaction = z.infer<typeof KitchenInventoryTransactionSchema>;
export type KitchenInventoryTransactionCreate = z.infer<typeof KitchenInventoryTransactionCreateSchema>;
export type KitchenInventoryTransactionUpdate = z.infer<typeof KitchenInventoryTransactionUpdateSchema>;
export type KitchenOrder = z.infer<typeof KitchenOrderSchema>;
export type KitchenOrderCreate = z.infer<typeof KitchenOrderCreateSchema>;
export type KitchenOrderUpdate = z.infer<typeof KitchenOrderUpdateSchema>;
export type KitchenOrderItem = z.infer<typeof KitchenOrderItemSchema>;
export type KitchenOrderItemCreate = z.infer<typeof KitchenOrderItemCreateSchema>;
export type KitchenOrderItemUpdate = z.infer<typeof KitchenOrderItemUpdateSchema>;
export type KitchenRecipe = z.infer<typeof KitchenRecipeSchema>;
export type KitchenRecipeCreate = z.infer<typeof KitchenRecipeCreateSchema>;
export type KitchenRecipeUpdate = z.infer<typeof KitchenRecipeUpdateSchema>;
export type KitchenRecipeIngredient = z.infer<typeof KitchenRecipeIngredientSchema>;
export type KitchenRecipeIngredientCreate = z.infer<typeof KitchenRecipeIngredientCreateSchema>;
export type KitchenRecipeIngredientUpdate = z.infer<typeof KitchenRecipeIngredientUpdateSchema>;
export type KitchenSettings = z.infer<typeof KitchenSettingsSchema>;
export type KitchenSettingsCreate = z.infer<typeof KitchenSettingsCreateSchema>;
export type KitchenSettingsUpdate = z.infer<typeof KitchenSettingsUpdateSchema>;
export type KitchenStaff = z.infer<typeof KitchenStaffSchema>;
export type KitchenStaffCreate = z.infer<typeof KitchenStaffCreateSchema>;
export type KitchenStaffUpdate = z.infer<typeof KitchenStaffUpdateSchema>;
export type KybApplication = z.infer<typeof KybApplicationSchema>;
export type KybApplicationCreate = z.infer<typeof KybApplicationCreateSchema>;
export type KybApplicationUpdate = z.infer<typeof KybApplicationUpdateSchema>;
export type KybDocument = z.infer<typeof KybDocumentSchema>;
export type KybDocumentCreate = z.infer<typeof KybDocumentCreateSchema>;
export type KybDocumentUpdate = z.infer<typeof KybDocumentUpdateSchema>;
export type LeaveApprovalConfig = z.infer<typeof LeaveApprovalConfigSchema>;
export type LeaveApprovalConfigCreate = z.infer<typeof LeaveApprovalConfigCreateSchema>;
export type LeaveApprovalConfigUpdate = z.infer<typeof LeaveApprovalConfigUpdateSchema>;
export type LeaveBalance = z.infer<typeof LeaveBalanceSchema>;
export type LeaveBalanceCreate = z.infer<typeof LeaveBalanceCreateSchema>;
export type LeaveBalanceUpdate = z.infer<typeof LeaveBalanceUpdateSchema>;
export type LeaveRequest = z.infer<typeof LeaveRequestSchema>;
export type LeaveRequestCreate = z.infer<typeof LeaveRequestCreateSchema>;
export type LeaveRequestUpdate = z.infer<typeof LeaveRequestUpdateSchema>;
export type LeaveType = z.infer<typeof LeaveTypeSchema>;
export type LeaveTypeCreate = z.infer<typeof LeaveTypeCreateSchema>;
export type LeaveTypeUpdate = z.infer<typeof LeaveTypeUpdateSchema>;
export type Location = z.infer<typeof LocationSchema>;
export type LocationCreate = z.infer<typeof LocationCreateSchema>;
export type LocationUpdate = z.infer<typeof LocationUpdateSchema>;
export type LoyaltyProgram = z.infer<typeof LoyaltyProgramSchema>;
export type LoyaltyProgramCreate = z.infer<typeof LoyaltyProgramCreateSchema>;
export type LoyaltyProgramUpdate = z.infer<typeof LoyaltyProgramUpdateSchema>;
export type LoyaltyReward = z.infer<typeof LoyaltyRewardSchema>;
export type LoyaltyRewardCreate = z.infer<typeof LoyaltyRewardCreateSchema>;
export type LoyaltyRewardUpdate = z.infer<typeof LoyaltyRewardUpdateSchema>;
export type LoyaltyTier = z.infer<typeof LoyaltyTierSchema>;
export type LoyaltyTierCreate = z.infer<typeof LoyaltyTierCreateSchema>;
export type LoyaltyTierUpdate = z.infer<typeof LoyaltyTierUpdateSchema>;
export type ManpowerBudget = z.infer<typeof ManpowerBudgetSchema>;
export type ManpowerBudgetCreate = z.infer<typeof ManpowerBudgetCreateSchema>;
export type ManpowerBudgetUpdate = z.infer<typeof ManpowerBudgetUpdateSchema>;
export type MfgBom = z.infer<typeof MfgBomSchema>;
export type MfgBomCreate = z.infer<typeof MfgBomCreateSchema>;
export type MfgBomUpdate = z.infer<typeof MfgBomUpdateSchema>;
export type MfgBomItem = z.infer<typeof MfgBomItemSchema>;
export type MfgBomItemCreate = z.infer<typeof MfgBomItemCreateSchema>;
export type MfgBomItemUpdate = z.infer<typeof MfgBomItemUpdateSchema>;
export type MfgMachine = z.infer<typeof MfgMachineSchema>;
export type MfgMachineCreate = z.infer<typeof MfgMachineCreateSchema>;
export type MfgMachineUpdate = z.infer<typeof MfgMachineUpdateSchema>;
export type MfgMaintenanceRecord = z.infer<typeof MfgMaintenanceRecordSchema>;
export type MfgMaintenanceRecordCreate = z.infer<typeof MfgMaintenanceRecordCreateSchema>;
export type MfgMaintenanceRecordUpdate = z.infer<typeof MfgMaintenanceRecordUpdateSchema>;
export type MfgProductionCost = z.infer<typeof MfgProductionCostSchema>;
export type MfgProductionCostCreate = z.infer<typeof MfgProductionCostCreateSchema>;
export type MfgProductionCostUpdate = z.infer<typeof MfgProductionCostUpdateSchema>;
export type MfgProductionPlan = z.infer<typeof MfgProductionPlanSchema>;
export type MfgProductionPlanCreate = z.infer<typeof MfgProductionPlanCreateSchema>;
export type MfgProductionPlanUpdate = z.infer<typeof MfgProductionPlanUpdateSchema>;
export type MfgProductionPlanItem = z.infer<typeof MfgProductionPlanItemSchema>;
export type MfgProductionPlanItemCreate = z.infer<typeof MfgProductionPlanItemCreateSchema>;
export type MfgProductionPlanItemUpdate = z.infer<typeof MfgProductionPlanItemUpdateSchema>;
export type MfgQcInspection = z.infer<typeof MfgQcInspectionSchema>;
export type MfgQcInspectionCreate = z.infer<typeof MfgQcInspectionCreateSchema>;
export type MfgQcInspectionUpdate = z.infer<typeof MfgQcInspectionUpdateSchema>;
export type MfgQcResult = z.infer<typeof MfgQcResultSchema>;
export type MfgQcResultCreate = z.infer<typeof MfgQcResultCreateSchema>;
export type MfgQcResultUpdate = z.infer<typeof MfgQcResultUpdateSchema>;
export type MfgQcTemplate = z.infer<typeof MfgQcTemplateSchema>;
export type MfgQcTemplateCreate = z.infer<typeof MfgQcTemplateCreateSchema>;
export type MfgQcTemplateUpdate = z.infer<typeof MfgQcTemplateUpdateSchema>;
export type MfgRouting = z.infer<typeof MfgRoutingSchema>;
export type MfgRoutingCreate = z.infer<typeof MfgRoutingCreateSchema>;
export type MfgRoutingUpdate = z.infer<typeof MfgRoutingUpdateSchema>;
export type MfgRoutingOperation = z.infer<typeof MfgRoutingOperationSchema>;
export type MfgRoutingOperationCreate = z.infer<typeof MfgRoutingOperationCreateSchema>;
export type MfgRoutingOperationUpdate = z.infer<typeof MfgRoutingOperationUpdateSchema>;
export type MfgSetting = z.infer<typeof MfgSettingSchema>;
export type MfgSettingCreate = z.infer<typeof MfgSettingCreateSchema>;
export type MfgSettingUpdate = z.infer<typeof MfgSettingUpdateSchema>;
export type MfgShiftProduction = z.infer<typeof MfgShiftProductionSchema>;
export type MfgShiftProductionCreate = z.infer<typeof MfgShiftProductionCreateSchema>;
export type MfgShiftProductionUpdate = z.infer<typeof MfgShiftProductionUpdateSchema>;
export type MfgWasteRecord = z.infer<typeof MfgWasteRecordSchema>;
export type MfgWasteRecordCreate = z.infer<typeof MfgWasteRecordCreateSchema>;
export type MfgWasteRecordUpdate = z.infer<typeof MfgWasteRecordUpdateSchema>;
export type MfgWoMaterial = z.infer<typeof MfgWoMaterialSchema>;
export type MfgWoMaterialCreate = z.infer<typeof MfgWoMaterialCreateSchema>;
export type MfgWoMaterialUpdate = z.infer<typeof MfgWoMaterialUpdateSchema>;
export type MfgWoOperation = z.infer<typeof MfgWoOperationSchema>;
export type MfgWoOperationCreate = z.infer<typeof MfgWoOperationCreateSchema>;
export type MfgWoOperationUpdate = z.infer<typeof MfgWoOperationUpdateSchema>;
export type MfgWoOutput = z.infer<typeof MfgWoOutputSchema>;
export type MfgWoOutputCreate = z.infer<typeof MfgWoOutputCreateSchema>;
export type MfgWoOutputUpdate = z.infer<typeof MfgWoOutputUpdateSchema>;
export type MfgWorkCenter = z.infer<typeof MfgWorkCenterSchema>;
export type MfgWorkCenterCreate = z.infer<typeof MfgWorkCenterCreateSchema>;
export type MfgWorkCenterUpdate = z.infer<typeof MfgWorkCenterUpdateSchema>;
export type MfgWorkOrder = z.infer<typeof MfgWorkOrderSchema>;
export type MfgWorkOrderCreate = z.infer<typeof MfgWorkOrderCreateSchema>;
export type MfgWorkOrderUpdate = z.infer<typeof MfgWorkOrderUpdateSchema>;
export type MktBudget = z.infer<typeof MktBudgetSchema>;
export type MktBudgetCreate = z.infer<typeof MktBudgetCreateSchema>;
export type MktBudgetUpdate = z.infer<typeof MktBudgetUpdateSchema>;
export type MktBudgetItem = z.infer<typeof MktBudgetItemSchema>;
export type MktBudgetItemCreate = z.infer<typeof MktBudgetItemCreateSchema>;
export type MktBudgetItemUpdate = z.infer<typeof MktBudgetItemUpdateSchema>;
export type MktCampaign = z.infer<typeof MktCampaignSchema>;
export type MktCampaignCreate = z.infer<typeof MktCampaignCreateSchema>;
export type MktCampaignUpdate = z.infer<typeof MktCampaignUpdateSchema>;
export type MktCampaignAudience = z.infer<typeof MktCampaignAudienceSchema>;
export type MktCampaignAudienceCreate = z.infer<typeof MktCampaignAudienceCreateSchema>;
export type MktCampaignAudienceUpdate = z.infer<typeof MktCampaignAudienceUpdateSchema>;
export type MktCampaignChannel = z.infer<typeof MktCampaignChannelSchema>;
export type MktCampaignChannelCreate = z.infer<typeof MktCampaignChannelCreateSchema>;
export type MktCampaignChannelUpdate = z.infer<typeof MktCampaignChannelUpdateSchema>;
export type MktContentAsset = z.infer<typeof MktContentAssetSchema>;
export type MktContentAssetCreate = z.infer<typeof MktContentAssetCreateSchema>;
export type MktContentAssetUpdate = z.infer<typeof MktContentAssetUpdateSchema>;
export type MktPromotion = z.infer<typeof MktPromotionSchema>;
export type MktPromotionCreate = z.infer<typeof MktPromotionCreateSchema>;
export type MktPromotionUpdate = z.infer<typeof MktPromotionUpdateSchema>;
export type MktPromotionUsage = z.infer<typeof MktPromotionUsageSchema>;
export type MktPromotionUsageCreate = z.infer<typeof MktPromotionUsageCreateSchema>;
export type MktPromotionUsageUpdate = z.infer<typeof MktPromotionUsageUpdateSchema>;
export type MktSegment = z.infer<typeof MktSegmentSchema>;
export type MktSegmentCreate = z.infer<typeof MktSegmentCreateSchema>;
export type MktSegmentUpdate = z.infer<typeof MktSegmentUpdateSchema>;
export type MktSegmentRule = z.infer<typeof MktSegmentRuleSchema>;
export type MktSegmentRuleCreate = z.infer<typeof MktSegmentRuleCreateSchema>;
export type MktSegmentRuleUpdate = z.infer<typeof MktSegmentRuleUpdateSchema>;
export type Module = z.infer<typeof ModuleSchema>;
export type ModuleCreate = z.infer<typeof ModuleCreateSchema>;
export type ModuleUpdate = z.infer<typeof ModuleUpdateSchema>;
export type ModuleDependency = z.infer<typeof ModuleDependencySchema>;
export type ModuleDependencyCreate = z.infer<typeof ModuleDependencyCreateSchema>;
export type ModuleDependencyUpdate = z.infer<typeof ModuleDependencyUpdateSchema>;
export type ModulePricing = z.infer<typeof ModulePricingSchema>;
export type ModulePricingCreate = z.infer<typeof ModulePricingCreateSchema>;
export type ModulePricingUpdate = z.infer<typeof ModulePricingUpdateSchema>;
export type NotificationSetting = z.infer<typeof NotificationSettingSchema>;
export type NotificationSettingCreate = z.infer<typeof NotificationSettingCreateSchema>;
export type NotificationSettingUpdate = z.infer<typeof NotificationSettingUpdateSchema>;
export type OrgStructure = z.infer<typeof OrgStructureSchema>;
export type OrgStructureCreate = z.infer<typeof OrgStructureCreateSchema>;
export type OrgStructureUpdate = z.infer<typeof OrgStructureUpdateSchema>;
export type OutletIntegration = z.infer<typeof OutletIntegrationSchema>;
export type OutletIntegrationCreate = z.infer<typeof OutletIntegrationCreateSchema>;
export type OutletIntegrationUpdate = z.infer<typeof OutletIntegrationUpdateSchema>;
export type Partner = z.infer<typeof PartnerSchema>;
export type PartnerCreate = z.infer<typeof PartnerCreateSchema>;
export type PartnerUpdate = z.infer<typeof PartnerUpdateSchema>;
export type PartnerIntegration = z.infer<typeof PartnerIntegrationSchema>;
export type PartnerIntegrationCreate = z.infer<typeof PartnerIntegrationCreateSchema>;
export type PartnerIntegrationUpdate = z.infer<typeof PartnerIntegrationUpdateSchema>;
export type PartnerOutlet = z.infer<typeof PartnerOutletSchema>;
export type PartnerOutletCreate = z.infer<typeof PartnerOutletCreateSchema>;
export type PartnerOutletUpdate = z.infer<typeof PartnerOutletUpdateSchema>;
export type PartnerSubscription = z.infer<typeof PartnerSubscriptionSchema>;
export type PartnerSubscriptionCreate = z.infer<typeof PartnerSubscriptionCreateSchema>;
export type PartnerSubscriptionUpdate = z.infer<typeof PartnerSubscriptionUpdateSchema>;
export type PartnerUser = z.infer<typeof PartnerUserSchema>;
export type PartnerUserCreate = z.infer<typeof PartnerUserCreateSchema>;
export type PartnerUserUpdate = z.infer<typeof PartnerUserUpdateSchema>;
export type PaymentTransaction = z.infer<typeof PaymentTransactionSchema>;
export type PaymentTransactionCreate = z.infer<typeof PaymentTransactionCreateSchema>;
export type PaymentTransactionUpdate = z.infer<typeof PaymentTransactionUpdateSchema>;
export type PayrollComponent = z.infer<typeof PayrollComponentSchema>;
export type PayrollComponentCreate = z.infer<typeof PayrollComponentCreateSchema>;
export type PayrollComponentUpdate = z.infer<typeof PayrollComponentUpdateSchema>;
export type PayrollRun = z.infer<typeof PayrollRunSchema>;
export type PayrollRunCreate = z.infer<typeof PayrollRunCreateSchema>;
export type PayrollRunUpdate = z.infer<typeof PayrollRunUpdateSchema>;
export type PerformanceReview = z.infer<typeof PerformanceReviewSchema>;
export type PerformanceReviewCreate = z.infer<typeof PerformanceReviewCreateSchema>;
export type PerformanceReviewUpdate = z.infer<typeof PerformanceReviewUpdateSchema>;
export type PjmBudget = z.infer<typeof PjmBudgetSchema>;
export type PjmBudgetCreate = z.infer<typeof PjmBudgetCreateSchema>;
export type PjmBudgetUpdate = z.infer<typeof PjmBudgetUpdateSchema>;
export type PjmDocument = z.infer<typeof PjmDocumentSchema>;
export type PjmDocumentCreate = z.infer<typeof PjmDocumentCreateSchema>;
export type PjmDocumentUpdate = z.infer<typeof PjmDocumentUpdateSchema>;
export type PjmMilestone = z.infer<typeof PjmMilestoneSchema>;
export type PjmMilestoneCreate = z.infer<typeof PjmMilestoneCreateSchema>;
export type PjmMilestoneUpdate = z.infer<typeof PjmMilestoneUpdateSchema>;
export type PjmProject = z.infer<typeof PjmProjectSchema>;
export type PjmProjectCreate = z.infer<typeof PjmProjectCreateSchema>;
export type PjmProjectUpdate = z.infer<typeof PjmProjectUpdateSchema>;
export type PjmResource = z.infer<typeof PjmResourceSchema>;
export type PjmResourceCreate = z.infer<typeof PjmResourceCreateSchema>;
export type PjmResourceUpdate = z.infer<typeof PjmResourceUpdateSchema>;
export type PjmRisk = z.infer<typeof PjmRiskSchema>;
export type PjmRiskCreate = z.infer<typeof PjmRiskCreateSchema>;
export type PjmRiskUpdate = z.infer<typeof PjmRiskUpdateSchema>;
export type PjmSetting = z.infer<typeof PjmSettingSchema>;
export type PjmSettingCreate = z.infer<typeof PjmSettingCreateSchema>;
export type PjmSettingUpdate = z.infer<typeof PjmSettingUpdateSchema>;
export type PjmTask = z.infer<typeof PjmTaskSchema>;
export type PjmTaskCreate = z.infer<typeof PjmTaskCreateSchema>;
export type PjmTaskUpdate = z.infer<typeof PjmTaskUpdateSchema>;
export type PjmTimesheet = z.infer<typeof PjmTimesheetSchema>;
export type PjmTimesheetCreate = z.infer<typeof PjmTimesheetCreateSchema>;
export type PjmTimesheetUpdate = z.infer<typeof PjmTimesheetUpdateSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type PlanCreate = z.infer<typeof PlanCreateSchema>;
export type PlanUpdate = z.infer<typeof PlanUpdateSchema>;
export type PlanLimit = z.infer<typeof PlanLimitSchema>;
export type PlanLimitCreate = z.infer<typeof PlanLimitCreateSchema>;
export type PlanLimitUpdate = z.infer<typeof PlanLimitUpdateSchema>;
export type PointTransaction = z.infer<typeof PointTransactionSchema>;
export type PointTransactionCreate = z.infer<typeof PointTransactionCreateSchema>;
export type PointTransactionUpdate = z.infer<typeof PointTransactionUpdateSchema>;
export type PosTransaction = z.infer<typeof PosTransactionSchema>;
export type PosTransactionCreate = z.infer<typeof PosTransactionCreateSchema>;
export type PosTransactionUpdate = z.infer<typeof PosTransactionUpdateSchema>;
export type PosTransactionItem = z.infer<typeof PosTransactionItemSchema>;
export type PosTransactionItemCreate = z.infer<typeof PosTransactionItemCreateSchema>;
export type PosTransactionItemUpdate = z.infer<typeof PosTransactionItemUpdateSchema>;
export type PriceTier = z.infer<typeof PriceTierSchema>;
export type PriceTierCreate = z.infer<typeof PriceTierCreateSchema>;
export type PriceTierUpdate = z.infer<typeof PriceTierUpdateSchema>;
export type PrinterConfig = z.infer<typeof PrinterConfigSchema>;
export type PrinterConfigCreate = z.infer<typeof PrinterConfigCreateSchema>;
export type PrinterConfigUpdate = z.infer<typeof PrinterConfigUpdateSchema>;
export type Product = z.infer<typeof ProductSchema>;
export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;
export type ProductCostComponent = z.infer<typeof ProductCostComponentSchema>;
export type ProductCostComponentCreate = z.infer<typeof ProductCostComponentCreateSchema>;
export type ProductCostComponentUpdate = z.infer<typeof ProductCostComponentUpdateSchema>;
export type ProductCostHistory = z.infer<typeof ProductCostHistorySchema>;
export type ProductCostHistoryCreate = z.infer<typeof ProductCostHistoryCreateSchema>;
export type ProductCostHistoryUpdate = z.infer<typeof ProductCostHistoryUpdateSchema>;
export type ProductPrice = z.infer<typeof ProductPriceSchema>;
export type ProductPriceCreate = z.infer<typeof ProductPriceCreateSchema>;
export type ProductPriceUpdate = z.infer<typeof ProductPriceUpdateSchema>;
export type ProductVariant = z.infer<typeof ProductVariantSchema>;
export type ProductVariantCreate = z.infer<typeof ProductVariantCreateSchema>;
export type ProductVariantUpdate = z.infer<typeof ProductVariantUpdateSchema>;
export type Production = z.infer<typeof ProductionSchema>;
export type ProductionCreate = z.infer<typeof ProductionCreateSchema>;
export type ProductionUpdate = z.infer<typeof ProductionUpdateSchema>;
export type ProductionHistory = z.infer<typeof ProductionHistorySchema>;
export type ProductionHistoryCreate = z.infer<typeof ProductionHistoryCreateSchema>;
export type ProductionHistoryUpdate = z.infer<typeof ProductionHistoryUpdateSchema>;
export type ProductionMaterial = z.infer<typeof ProductionMaterialSchema>;
export type ProductionMaterialCreate = z.infer<typeof ProductionMaterialCreateSchema>;
export type ProductionMaterialUpdate = z.infer<typeof ProductionMaterialUpdateSchema>;
export type ProductionWaste = z.infer<typeof ProductionWasteSchema>;
export type ProductionWasteCreate = z.infer<typeof ProductionWasteCreateSchema>;
export type ProductionWasteUpdate = z.infer<typeof ProductionWasteUpdateSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
export type ProjectPayroll = z.infer<typeof ProjectPayrollSchema>;
export type ProjectPayrollCreate = z.infer<typeof ProjectPayrollCreateSchema>;
export type ProjectPayrollUpdate = z.infer<typeof ProjectPayrollUpdateSchema>;
export type ProjectTimesheet = z.infer<typeof ProjectTimesheetSchema>;
export type ProjectTimesheetCreate = z.infer<typeof ProjectTimesheetCreateSchema>;
export type ProjectTimesheetUpdate = z.infer<typeof ProjectTimesheetUpdateSchema>;
export type ProjectWorker = z.infer<typeof ProjectWorkerSchema>;
export type ProjectWorkerCreate = z.infer<typeof ProjectWorkerCreateSchema>;
export type ProjectWorkerUpdate = z.infer<typeof ProjectWorkerUpdateSchema>;
export type Promo = z.infer<typeof PromoSchema>;
export type PromoCreate = z.infer<typeof PromoCreateSchema>;
export type PromoUpdate = z.infer<typeof PromoUpdateSchema>;
export type PromoBundle = z.infer<typeof PromoBundleSchema>;
export type PromoBundleCreate = z.infer<typeof PromoBundleCreateSchema>;
export type PromoBundleUpdate = z.infer<typeof PromoBundleUpdateSchema>;
export type PromoCategory = z.infer<typeof PromoCategorySchema>;
export type PromoCategoryCreate = z.infer<typeof PromoCategoryCreateSchema>;
export type PromoCategoryUpdate = z.infer<typeof PromoCategoryUpdateSchema>;
export type PromoProduct = z.infer<typeof PromoProductSchema>;
export type PromoProductCreate = z.infer<typeof PromoProductCreateSchema>;
export type PromoProductUpdate = z.infer<typeof PromoProductUpdateSchema>;
export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
export type PurchaseOrderCreate = z.infer<typeof PurchaseOrderCreateSchema>;
export type PurchaseOrderUpdate = z.infer<typeof PurchaseOrderUpdateSchema>;
export type PurchaseOrderItem = z.infer<typeof PurchaseOrderItemSchema>;
export type PurchaseOrderItemCreate = z.infer<typeof PurchaseOrderItemCreateSchema>;
export type PurchaseOrderItemUpdate = z.infer<typeof PurchaseOrderItemUpdateSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
export type RecipeCreate = z.infer<typeof RecipeCreateSchema>;
export type RecipeUpdate = z.infer<typeof RecipeUpdateSchema>;
export type RecipeHistory = z.infer<typeof RecipeHistorySchema>;
export type RecipeHistoryCreate = z.infer<typeof RecipeHistoryCreateSchema>;
export type RecipeHistoryUpdate = z.infer<typeof RecipeHistoryUpdateSchema>;
export type RecipeIngredient = z.infer<typeof RecipeIngredientSchema>;
export type RecipeIngredientCreate = z.infer<typeof RecipeIngredientCreateSchema>;
export type RecipeIngredientUpdate = z.infer<typeof RecipeIngredientUpdateSchema>;
export type Recognition = z.infer<typeof RecognitionSchema>;
export type RecognitionCreate = z.infer<typeof RecognitionCreateSchema>;
export type RecognitionUpdate = z.infer<typeof RecognitionUpdateSchema>;
export type Reservation = z.infer<typeof ReservationSchema>;
export type ReservationCreate = z.infer<typeof ReservationCreateSchema>;
export type ReservationUpdate = z.infer<typeof ReservationUpdateSchema>;
export type RewardRedemption = z.infer<typeof RewardRedemptionSchema>;
export type RewardRedemptionCreate = z.infer<typeof RewardRedemptionCreateSchema>;
export type RewardRedemptionUpdate = z.infer<typeof RewardRedemptionUpdateSchema>;
export type Role = z.infer<typeof RoleSchema>;
export type RoleCreate = z.infer<typeof RoleCreateSchema>;
export type RoleUpdate = z.infer<typeof RoleUpdateSchema>;
export type SalesOrder = z.infer<typeof SalesOrderSchema>;
export type SalesOrderCreate = z.infer<typeof SalesOrderCreateSchema>;
export type SalesOrderUpdate = z.infer<typeof SalesOrderUpdateSchema>;
export type SalesOrderItem = z.infer<typeof SalesOrderItemSchema>;
export type SalesOrderItemCreate = z.infer<typeof SalesOrderItemCreateSchema>;
export type SalesOrderItemUpdate = z.infer<typeof SalesOrderItemUpdateSchema>;
export type SfaAchievement = z.infer<typeof SfaAchievementSchema>;
export type SfaAchievementCreate = z.infer<typeof SfaAchievementCreateSchema>;
export type SfaAchievementUpdate = z.infer<typeof SfaAchievementUpdateSchema>;
export type SfaAchievementDetail = z.infer<typeof SfaAchievementDetailSchema>;
export type SfaAchievementDetailCreate = z.infer<typeof SfaAchievementDetailCreateSchema>;
export type SfaAchievementDetailUpdate = z.infer<typeof SfaAchievementDetailUpdateSchema>;
export type SfaActivity = z.infer<typeof SfaActivitySchema>;
export type SfaActivityCreate = z.infer<typeof SfaActivityCreateSchema>;
export type SfaActivityUpdate = z.infer<typeof SfaActivityUpdateSchema>;
export type SfaApprovalRequest = z.infer<typeof SfaApprovalRequestSchema>;
export type SfaApprovalRequestCreate = z.infer<typeof SfaApprovalRequestCreateSchema>;
export type SfaApprovalRequestUpdate = z.infer<typeof SfaApprovalRequestUpdateSchema>;
export type SfaApprovalStep = z.infer<typeof SfaApprovalStepSchema>;
export type SfaApprovalStepCreate = z.infer<typeof SfaApprovalStepCreateSchema>;
export type SfaApprovalStepUpdate = z.infer<typeof SfaApprovalStepUpdateSchema>;
export type SfaApprovalWorkflow = z.infer<typeof SfaApprovalWorkflowSchema>;
export type SfaApprovalWorkflowCreate = z.infer<typeof SfaApprovalWorkflowCreateSchema>;
export type SfaApprovalWorkflowUpdate = z.infer<typeof SfaApprovalWorkflowUpdateSchema>;
export type SfaCommissionGroup = z.infer<typeof SfaCommissionGroupSchema>;
export type SfaCommissionGroupCreate = z.infer<typeof SfaCommissionGroupCreateSchema>;
export type SfaCommissionGroupUpdate = z.infer<typeof SfaCommissionGroupUpdateSchema>;
export type SfaCommissionGroupProduct = z.infer<typeof SfaCommissionGroupProductSchema>;
export type SfaCommissionGroupProductCreate = z.infer<typeof SfaCommissionGroupProductCreateSchema>;
export type SfaCommissionGroupProductUpdate = z.infer<typeof SfaCommissionGroupProductUpdateSchema>;
export type SfaCompetitorActivity = z.infer<typeof SfaCompetitorActivitySchema>;
export type SfaCompetitorActivityCreate = z.infer<typeof SfaCompetitorActivityCreateSchema>;
export type SfaCompetitorActivityUpdate = z.infer<typeof SfaCompetitorActivityUpdateSchema>;
export type SfaCoverageAssignment = z.infer<typeof SfaCoverageAssignmentSchema>;
export type SfaCoverageAssignmentCreate = z.infer<typeof SfaCoverageAssignmentCreateSchema>;
export type SfaCoverageAssignmentUpdate = z.infer<typeof SfaCoverageAssignmentUpdateSchema>;
export type SfaCoveragePlan = z.infer<typeof SfaCoveragePlanSchema>;
export type SfaCoveragePlanCreate = z.infer<typeof SfaCoveragePlanCreateSchema>;
export type SfaCoveragePlanUpdate = z.infer<typeof SfaCoveragePlanUpdateSchema>;
export type SfaDisplayAudit = z.infer<typeof SfaDisplayAuditSchema>;
export type SfaDisplayAuditCreate = z.infer<typeof SfaDisplayAuditCreateSchema>;
export type SfaDisplayAuditUpdate = z.infer<typeof SfaDisplayAuditUpdateSchema>;
export type SfaDisplayItem = z.infer<typeof SfaDisplayItemSchema>;
export type SfaDisplayItemCreate = z.infer<typeof SfaDisplayItemCreateSchema>;
export type SfaDisplayItemUpdate = z.infer<typeof SfaDisplayItemUpdateSchema>;
export type SfaFieldOrder = z.infer<typeof SfaFieldOrderSchema>;
export type SfaFieldOrderCreate = z.infer<typeof SfaFieldOrderCreateSchema>;
export type SfaFieldOrderUpdate = z.infer<typeof SfaFieldOrderUpdateSchema>;
export type SfaFieldOrderItem = z.infer<typeof SfaFieldOrderItemSchema>;
export type SfaFieldOrderItemCreate = z.infer<typeof SfaFieldOrderItemCreateSchema>;
export type SfaFieldOrderItemUpdate = z.infer<typeof SfaFieldOrderItemUpdateSchema>;
export type SfaGeofence = z.infer<typeof SfaGeofenceSchema>;
export type SfaGeofenceCreate = z.infer<typeof SfaGeofenceCreateSchema>;
export type SfaGeofenceUpdate = z.infer<typeof SfaGeofenceUpdateSchema>;
export type SfaIncentiveCalculation = z.infer<typeof SfaIncentiveCalculationSchema>;
export type SfaIncentiveCalculationCreate = z.infer<typeof SfaIncentiveCalculationCreateSchema>;
export type SfaIncentiveCalculationUpdate = z.infer<typeof SfaIncentiveCalculationUpdateSchema>;
export type SfaIncentiveScheme = z.infer<typeof SfaIncentiveSchemeSchema>;
export type SfaIncentiveSchemeCreate = z.infer<typeof SfaIncentiveSchemeCreateSchema>;
export type SfaIncentiveSchemeUpdate = z.infer<typeof SfaIncentiveSchemeUpdateSchema>;
export type SfaIncentiveTier = z.infer<typeof SfaIncentiveTierSchema>;
export type SfaIncentiveTierCreate = z.infer<typeof SfaIncentiveTierCreateSchema>;
export type SfaIncentiveTierUpdate = z.infer<typeof SfaIncentiveTierUpdateSchema>;
export type SfaLead = z.infer<typeof SfaLeadSchema>;
export type SfaLeadCreate = z.infer<typeof SfaLeadCreateSchema>;
export type SfaLeadUpdate = z.infer<typeof SfaLeadUpdateSchema>;
export type SfaOpportunity = z.infer<typeof SfaOpportunitySchema>;
export type SfaOpportunityCreate = z.infer<typeof SfaOpportunityCreateSchema>;
export type SfaOpportunityUpdate = z.infer<typeof SfaOpportunityUpdateSchema>;
export type SfaOutletTarget = z.infer<typeof SfaOutletTargetSchema>;
export type SfaOutletTargetCreate = z.infer<typeof SfaOutletTargetCreateSchema>;
export type SfaOutletTargetUpdate = z.infer<typeof SfaOutletTargetUpdateSchema>;
export type SfaParameter = z.infer<typeof SfaParameterSchema>;
export type SfaParameterCreate = z.infer<typeof SfaParameterCreateSchema>;
export type SfaParameterUpdate = z.infer<typeof SfaParameterUpdateSchema>;
export type SfaPlafon = z.infer<typeof SfaPlafonSchema>;
export type SfaPlafonCreate = z.infer<typeof SfaPlafonCreateSchema>;
export type SfaPlafonUpdate = z.infer<typeof SfaPlafonUpdateSchema>;
export type SfaPlafonUsage = z.infer<typeof SfaPlafonUsageSchema>;
export type SfaPlafonUsageCreate = z.infer<typeof SfaPlafonUsageCreateSchema>;
export type SfaPlafonUsageUpdate = z.infer<typeof SfaPlafonUsageUpdateSchema>;
export type SfaProductCommission = z.infer<typeof SfaProductCommissionSchema>;
export type SfaProductCommissionCreate = z.infer<typeof SfaProductCommissionCreateSchema>;
export type SfaProductCommissionUpdate = z.infer<typeof SfaProductCommissionUpdateSchema>;
export type SfaQuotation = z.infer<typeof SfaQuotationSchema>;
export type SfaQuotationCreate = z.infer<typeof SfaQuotationCreateSchema>;
export type SfaQuotationUpdate = z.infer<typeof SfaQuotationUpdateSchema>;
export type SfaQuotationItem = z.infer<typeof SfaQuotationItemSchema>;
export type SfaQuotationItemCreate = z.infer<typeof SfaQuotationItemCreateSchema>;
export type SfaQuotationItemUpdate = z.infer<typeof SfaQuotationItemUpdateSchema>;
export type SfaRoutePlan = z.infer<typeof SfaRoutePlanSchema>;
export type SfaRoutePlanCreate = z.infer<typeof SfaRoutePlanCreateSchema>;
export type SfaRoutePlanUpdate = z.infer<typeof SfaRoutePlanUpdateSchema>;
export type SfaSalesStrategy = z.infer<typeof SfaSalesStrategySchema>;
export type SfaSalesStrategyCreate = z.infer<typeof SfaSalesStrategyCreateSchema>;
export type SfaSalesStrategyUpdate = z.infer<typeof SfaSalesStrategyUpdateSchema>;
export type SfaStrategyKpi = z.infer<typeof SfaStrategyKpiSchema>;
export type SfaStrategyKpiCreate = z.infer<typeof SfaStrategyKpiCreateSchema>;
export type SfaStrategyKpiUpdate = z.infer<typeof SfaStrategyKpiUpdateSchema>;
export type SfaSurveyQuestion = z.infer<typeof SfaSurveyQuestionSchema>;
export type SfaSurveyQuestionCreate = z.infer<typeof SfaSurveyQuestionCreateSchema>;
export type SfaSurveyQuestionUpdate = z.infer<typeof SfaSurveyQuestionUpdateSchema>;
export type SfaSurveyResponse = z.infer<typeof SfaSurveyResponseSchema>;
export type SfaSurveyResponseCreate = z.infer<typeof SfaSurveyResponseCreateSchema>;
export type SfaSurveyResponseUpdate = z.infer<typeof SfaSurveyResponseUpdateSchema>;
export type SfaSurveyTemplate = z.infer<typeof SfaSurveyTemplateSchema>;
export type SfaSurveyTemplateCreate = z.infer<typeof SfaSurveyTemplateCreateSchema>;
export type SfaSurveyTemplateUpdate = z.infer<typeof SfaSurveyTemplateUpdateSchema>;
export type SfaTarget = z.infer<typeof SfaTargetSchema>;
export type SfaTargetCreate = z.infer<typeof SfaTargetCreateSchema>;
export type SfaTargetUpdate = z.infer<typeof SfaTargetUpdateSchema>;
export type SfaTargetAssignment = z.infer<typeof SfaTargetAssignmentSchema>;
export type SfaTargetAssignmentCreate = z.infer<typeof SfaTargetAssignmentCreateSchema>;
export type SfaTargetAssignmentUpdate = z.infer<typeof SfaTargetAssignmentUpdateSchema>;
export type SfaTargetGroup = z.infer<typeof SfaTargetGroupSchema>;
export type SfaTargetGroupCreate = z.infer<typeof SfaTargetGroupCreateSchema>;
export type SfaTargetGroupUpdate = z.infer<typeof SfaTargetGroupUpdateSchema>;
export type SfaTargetProduct = z.infer<typeof SfaTargetProductSchema>;
export type SfaTargetProductCreate = z.infer<typeof SfaTargetProductCreateSchema>;
export type SfaTargetProductUpdate = z.infer<typeof SfaTargetProductUpdateSchema>;
export type SfaTeam = z.infer<typeof SfaTeamSchema>;
export type SfaTeamCreate = z.infer<typeof SfaTeamCreateSchema>;
export type SfaTeamUpdate = z.infer<typeof SfaTeamUpdateSchema>;
export type SfaTeamMember = z.infer<typeof SfaTeamMemberSchema>;
export type SfaTeamMemberCreate = z.infer<typeof SfaTeamMemberCreateSchema>;
export type SfaTeamMemberUpdate = z.infer<typeof SfaTeamMemberUpdateSchema>;
export type SfaTerritory = z.infer<typeof SfaTerritorySchema>;
export type SfaTerritoryCreate = z.infer<typeof SfaTerritoryCreateSchema>;
export type SfaTerritoryUpdate = z.infer<typeof SfaTerritoryUpdateSchema>;
export type SfaVisit = z.infer<typeof SfaVisitSchema>;
export type SfaVisitCreate = z.infer<typeof SfaVisitCreateSchema>;
export type SfaVisitUpdate = z.infer<typeof SfaVisitUpdateSchema>;
export type Shift = z.infer<typeof ShiftSchema>;
export type ShiftCreate = z.infer<typeof ShiftCreateSchema>;
export type ShiftUpdate = z.infer<typeof ShiftUpdateSchema>;
export type ShiftHandover = z.infer<typeof ShiftHandoverSchema>;
export type ShiftHandoverCreate = z.infer<typeof ShiftHandoverCreateSchema>;
export type ShiftHandoverUpdate = z.infer<typeof ShiftHandoverUpdateSchema>;
export type ShiftRotation = z.infer<typeof ShiftRotationSchema>;
export type ShiftRotationCreate = z.infer<typeof ShiftRotationCreateSchema>;
export type ShiftRotationUpdate = z.infer<typeof ShiftRotationUpdateSchema>;
export type ShiftSchedule = z.infer<typeof ShiftScheduleSchema>;
export type ShiftScheduleCreate = z.infer<typeof ShiftScheduleCreateSchema>;
export type ShiftScheduleUpdate = z.infer<typeof ShiftScheduleUpdateSchema>;
export type ShiftTemplate = z.infer<typeof ShiftTemplateSchema>;
export type ShiftTemplateCreate = z.infer<typeof ShiftTemplateCreateSchema>;
export type ShiftTemplateUpdate = z.infer<typeof ShiftTemplateUpdateSchema>;
export type Stock = z.infer<typeof StockSchema>;
export type StockCreate = z.infer<typeof StockCreateSchema>;
export type StockUpdate = z.infer<typeof StockUpdateSchema>;
export type StockAdjustment = z.infer<typeof StockAdjustmentSchema>;
export type StockAdjustmentCreate = z.infer<typeof StockAdjustmentCreateSchema>;
export type StockAdjustmentUpdate = z.infer<typeof StockAdjustmentUpdateSchema>;
export type StockAdjustmentItem = z.infer<typeof StockAdjustmentItemSchema>;
export type StockAdjustmentItemCreate = z.infer<typeof StockAdjustmentItemCreateSchema>;
export type StockAdjustmentItemUpdate = z.infer<typeof StockAdjustmentItemUpdateSchema>;
export type StockMovement = z.infer<typeof StockMovementSchema>;
export type StockMovementCreate = z.infer<typeof StockMovementCreateSchema>;
export type StockMovementUpdate = z.infer<typeof StockMovementUpdateSchema>;
export type StockOpname = z.infer<typeof StockOpnameSchema>;
export type StockOpnameCreate = z.infer<typeof StockOpnameCreateSchema>;
export type StockOpnameUpdate = z.infer<typeof StockOpnameUpdateSchema>;
export type StockOpnameItem = z.infer<typeof StockOpnameItemSchema>;
export type StockOpnameItemCreate = z.infer<typeof StockOpnameItemCreateSchema>;
export type StockOpnameItemUpdate = z.infer<typeof StockOpnameItemUpdateSchema>;
export type Store = z.infer<typeof StoreSchema>;
export type StoreCreate = z.infer<typeof StoreCreateSchema>;
export type StoreUpdate = z.infer<typeof StoreUpdateSchema>;
export type StoreSetting = z.infer<typeof StoreSettingSchema>;
export type StoreSettingCreate = z.infer<typeof StoreSettingCreateSchema>;
export type StoreSettingUpdate = z.infer<typeof StoreSettingUpdateSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type SubscriptionCreate = z.infer<typeof SubscriptionCreateSchema>;
export type SubscriptionUpdate = z.infer<typeof SubscriptionUpdateSchema>;
export type SubscriptionPackage = z.infer<typeof SubscriptionPackageSchema>;
export type SubscriptionPackageCreate = z.infer<typeof SubscriptionPackageCreateSchema>;
export type SubscriptionPackageUpdate = z.infer<typeof SubscriptionPackageUpdateSchema>;
export type Supplier = z.infer<typeof SupplierSchema>;
export type SupplierCreate = z.infer<typeof SupplierCreateSchema>;
export type SupplierUpdate = z.infer<typeof SupplierUpdateSchema>;
export type Survey = z.infer<typeof SurveySchema>;
export type SurveyCreate = z.infer<typeof SurveyCreateSchema>;
export type SurveyUpdate = z.infer<typeof SurveyUpdateSchema>;
export type SurveyResponse = z.infer<typeof SurveyResponseSchema>;
export type SurveyResponseCreate = z.infer<typeof SurveyResponseCreateSchema>;
export type SurveyResponseUpdate = z.infer<typeof SurveyResponseUpdateSchema>;
export type SyncLog = z.infer<typeof SyncLogSchema>;
export type SyncLogCreate = z.infer<typeof SyncLogCreateSchema>;
export type SyncLogUpdate = z.infer<typeof SyncLogUpdateSchema>;
export type SystemAlert = z.infer<typeof SystemAlertSchema>;
export type SystemAlertCreate = z.infer<typeof SystemAlertCreateSchema>;
export type SystemAlertUpdate = z.infer<typeof SystemAlertUpdateSchema>;
export type SystemBackup = z.infer<typeof SystemBackupSchema>;
export type SystemBackupCreate = z.infer<typeof SystemBackupCreateSchema>;
export type SystemBackupUpdate = z.infer<typeof SystemBackupUpdateSchema>;
export type Table = z.infer<typeof TableSchema>;
export type TableCreate = z.infer<typeof TableCreateSchema>;
export type TableUpdate = z.infer<typeof TableUpdateSchema>;
export type TableSession = z.infer<typeof TableSessionSchema>;
export type TableSessionCreate = z.infer<typeof TableSessionCreateSchema>;
export type TableSessionUpdate = z.infer<typeof TableSessionUpdateSchema>;
export type Tenant = z.infer<typeof TenantSchema>;
export type TenantCreate = z.infer<typeof TenantCreateSchema>;
export type TenantUpdate = z.infer<typeof TenantUpdateSchema>;
export type TenantModule = z.infer<typeof TenantModuleSchema>;
export type TenantModuleCreate = z.infer<typeof TenantModuleCreateSchema>;
export type TenantModuleUpdate = z.infer<typeof TenantModuleUpdateSchema>;
export type TerminationRequest = z.infer<typeof TerminationRequestSchema>;
export type TerminationRequestCreate = z.infer<typeof TerminationRequestCreateSchema>;
export type TerminationRequestUpdate = z.infer<typeof TerminationRequestUpdateSchema>;
export type TravelExpense = z.infer<typeof TravelExpenseSchema>;
export type TravelExpenseCreate = z.infer<typeof TravelExpenseCreateSchema>;
export type TravelExpenseUpdate = z.infer<typeof TravelExpenseUpdateSchema>;
export type TravelRequest = z.infer<typeof TravelRequestSchema>;
export type TravelRequestCreate = z.infer<typeof TravelRequestCreateSchema>;
export type TravelRequestUpdate = z.infer<typeof TravelRequestUpdateSchema>;
export type Unit = z.infer<typeof UnitSchema>;
export type UnitCreate = z.infer<typeof UnitCreateSchema>;
export type UnitUpdate = z.infer<typeof UnitUpdateSchema>;
export type UsageMetric = z.infer<typeof UsageMetricSchema>;
export type UsageMetricCreate = z.infer<typeof UsageMetricCreateSchema>;
export type UsageMetricUpdate = z.infer<typeof UsageMetricUpdateSchema>;
export type User = z.infer<typeof UserSchema>;
export type UserCreate = z.infer<typeof UserCreateSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type Voucher = z.infer<typeof VoucherSchema>;
export type VoucherCreate = z.infer<typeof VoucherCreateSchema>;
export type VoucherUpdate = z.infer<typeof VoucherUpdateSchema>;
export type Warehouse = z.infer<typeof WarehouseSchema>;
export type WarehouseCreate = z.infer<typeof WarehouseCreateSchema>;
export type WarehouseUpdate = z.infer<typeof WarehouseUpdateSchema>;
export type WarningLetter = z.infer<typeof WarningLetterSchema>;
export type WarningLetterCreate = z.infer<typeof WarningLetterCreateSchema>;
export type WarningLetterUpdate = z.infer<typeof WarningLetterUpdateSchema>;
export type Webhook = z.infer<typeof WebhookSchema>;
export type WebhookCreate = z.infer<typeof WebhookCreateSchema>;
export type WebhookUpdate = z.infer<typeof WebhookUpdateSchema>;
export type WorkShift = z.infer<typeof WorkShiftSchema>;
export type WorkShiftCreate = z.infer<typeof WorkShiftCreateSchema>;
export type WorkShiftUpdate = z.infer<typeof WorkShiftUpdateSchema>;
export type Waste = z.infer<typeof WasteSchema>;
export type WasteCreate = z.infer<typeof WasteCreateSchema>;
export type WasteUpdate = z.infer<typeof WasteUpdateSchema>;

// ============================================================
// API RESPONSE/REQUEST HELPERS
// ============================================================

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
    totalPages: z.number().int(),
  });

export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string().optional(),
});
