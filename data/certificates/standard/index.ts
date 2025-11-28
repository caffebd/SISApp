import solidFuelSweep from "./solid-fuel-sweep.json";

export interface StandardCertificateTemplate {
  id: string;
  name: string;
  description: string;
  isStandard: boolean;
  elements: any[];
}

export const standardCertificates: StandardCertificateTemplate[] = [
  solidFuelSweep as StandardCertificateTemplate,
];

export default standardCertificates;
