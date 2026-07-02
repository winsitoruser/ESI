import { Sequelize, Model, DataTypes } from 'sequelize';

// Model Type Definitions
interface PartnerModel extends Model {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  subscription?: SubscriptionModel;
  cluster?: ClusterModel;
  enabledModules?: EnabledModuleModel[];
  customizations?: PartnerCustomizationModel[];
}

interface SubscriptionModel extends Model {
  id: string;
  partnerId: string;
  plan: string;
  status: string;
  startDate: Date;
  endDate: Date;
  renewalDate: Date;
  price: number;
  paymentStatus?: string;
  lastPaymentDate?: Date;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  partner?: PartnerModel;
}

interface ModuleModel extends Model {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  price: number;
  availableInPlans: string[];
  isStandard: boolean;
  version: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  enabledIn?: EnabledModuleModel[];
  features?: ModuleFeatureModel[];
  customizationOptions?: CustomizationOptionModel[];
}

interface EnabledModuleModel extends Model {
  id: string;
  partnerId: string;
  moduleId: string;
  activatedAt: Date;
  status: string;
  version: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  partner?: PartnerModel;
  module?: ModuleModel;
}

interface ClusterModel extends Model {
  id: string;
  partnerId: string;
  name: string;
  status: string;
  region: string;
  dashboardUrl?: string;
  apiEndpoint?: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  partner?: PartnerModel;
  services?: DeployedServiceModel[];
}

interface DeployedServiceModel extends Model {
  id: string;
  clusterId: string;
  moduleId: string;
  name: string;
  status: string;
  endpoint?: string;
  version: string;
  deployedAt: Date;
  lastUpdatedAt?: Date;
  config: any;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  cluster?: ClusterModel;
  module?: ModuleModel;
}

interface CustomizationOptionModel extends Model {
  id: string;
  name: string;
  description?: string;
  moduleId?: string;
  availableInPlans: string[];
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  module?: ModuleModel;
  values?: OptionValueModel[];
  partnerCustomizations?: PartnerCustomizationModel[];
}

interface OptionValueModel extends Model {
  id: string;
  optionId: string;
  name: string;
  price: number;
  includedInPlans: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  option?: CustomizationOptionModel;
  selectedBy?: PartnerCustomizationModel[];
}

interface PartnerCustomizationModel extends Model {
  id: string;
  partnerId: string;
  customizationId: string;
  selectedOptionValue: string;
  appliedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  partner?: PartnerModel;
  customizationOption?: CustomizationOptionModel;
  selectedValue?: OptionValueModel;
}

interface ModuleFeatureModel extends Model {
  id: string;
  moduleId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Associations
  module?: ModuleModel;
}

// Database Interface
interface DB {
  sequelize: Sequelize;
  Sequelize: typeof DataTypes;
  Partner: typeof Model & {
    new(): PartnerModel;
    findByPk(id: string, options?: any): Promise<PartnerModel | null>;
    findAll(options?: any): Promise<PartnerModel[]>;
    create(data: any, options?: any): Promise<PartnerModel>;
    update(data: any, options?: any): Promise<[number, PartnerModel[]]>;
  };
  Subscription: typeof Model & {
    new(): SubscriptionModel;
    findByPk(id: string, options?: any): Promise<SubscriptionModel | null>;
    findAll(options?: any): Promise<SubscriptionModel[]>;
    create(data: any, options?: any): Promise<SubscriptionModel>;
    update(data: any, options?: any): Promise<[number, SubscriptionModel[]]>;
  };
  Module: typeof Model & {
    new(): ModuleModel;
    findByPk(id: string, options?: any): Promise<ModuleModel | null>;
    findAll(options?: any): Promise<ModuleModel[]>;
    create(data: any, options?: any): Promise<ModuleModel>;
  };
  EnabledModule: typeof Model & {
    new(): EnabledModuleModel;
    findByPk(id: string, options?: any): Promise<EnabledModuleModel | null>;
    findAll(options?: any): Promise<EnabledModuleModel[]>;
    create(data: any, options?: any): Promise<EnabledModuleModel>;
    update(data: any, options?: any): Promise<[number, EnabledModuleModel[]]>;
    findOrCreate(options?: any): Promise<[EnabledModuleModel, boolean]>;
    destroy(options?: any): Promise<number>;
  };
  Cluster: typeof Model & {
    new(): ClusterModel;
    findByPk(id: string, options?: any): Promise<ClusterModel | null>;
    create(data: any, options?: any): Promise<ClusterModel>;
  };
  DeployedService: typeof Model & {
    new(): DeployedServiceModel;
    findByPk(id: string, options?: any): Promise<DeployedServiceModel | null>;
    create(data: any, options?: any): Promise<DeployedServiceModel>;
  };
  CustomizationOption: typeof Model & {
    new(): CustomizationOptionModel;
    findByPk(id: string, options?: any): Promise<CustomizationOptionModel | null>;
  };
  OptionValue: typeof Model & {
    new(): OptionValueModel;
    findByPk(id: string, options?: any): Promise<OptionValueModel | null>;
  };
  PartnerCustomization: typeof Model & {
    new(): PartnerCustomizationModel;
    findByPk(id: string, options?: any): Promise<PartnerCustomizationModel | null>;
    create(data: any, options?: any): Promise<PartnerCustomizationModel>;
    destroy(options?: any): Promise<number>;
  };
  ModuleFeature: typeof Model & {
    new(): ModuleFeatureModel;
    findByPk(id: string, options?: any): Promise<ModuleFeatureModel | null>;
  };
}

declare const db: DB;
export default db;
