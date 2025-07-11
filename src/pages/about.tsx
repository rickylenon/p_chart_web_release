import { NextPage } from 'next';
import Layout from '@/components/layout/Layout';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { ExternalLinkIcon, Server, Code, BarChart3, Database, Globe, Users, Workflow, ShieldCheck, Settings, Download } from 'lucide-react';
import Head from 'next/head';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';

// Define the feature item component
const FeatureItem = ({ icon: Icon, title, description }: { icon: any, title: string, description: string }) => (
  <div className="flex gap-4 p-4 rounded-lg border border-gray-100 bg-white shadow-sm">
    <div className="shrink-0 mt-0.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </div>
    <div>
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </div>
  </div>
);

// Tech stack item component
const TechItem = ({ name, description }: { name: string, description: string }) => (
  <div className="flex flex-col gap-1">
    <Badge variant="outline" className="w-fit font-medium">{name}</Badge>
    <p className="text-xs text-gray-500">{description}</p>
  </div>
);

// Import package version for consistency
const packageInfo = require("../../package.json");

const AboutPage: NextPage = () => {
  const version = packageInfo.version;
  const releaseDate = "May 2024";
  
  return (
    <DashboardLayout>
      <Head>
        <title>About | P-Chart System</title>
      </Head>
      
      
      <div className="py-6">
      <PageHeader
            title="About P-Chart System"
            description="Learn more about our production monitoring and quality control web application"
            
          />
        
        
        {/* Main Information Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl">P-Chart System</CardTitle>
                <CardDescription>Version {version} | Released {releaseDate}</CardDescription>
              </div>
              <Badge variant="secondary" className="h-fit px-3 py-1">Web Application</Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Overview</h2>
              <p className="text-gray-700">
                The P-Chart System is a comprehensive web-based application designed for real-time defect monitoring and production process tracking. 
                Built with modern web technologies, it provides centralized access to production data through a responsive and intuitive interface within the organization&apos;s network.
              </p>
              <p className="text-gray-700">
                Its primary goal is to enhance production efficiency through streamlined defect tracking, real-time reporting, and multi-user collaboration,
                ultimately improving quality control processes and reducing production defects.
              </p>
              <p className="text-gray-700">
                The system implements a role-based access control mechanism, allowing different stakeholders to interact with the system according to their responsibilities. Production managers, quality engineers, and operators can all access tailored views designed to support their specific needs and workflows.
              </p>
              <p className="text-gray-700">
                P-Chart System handles the entire production tracking workflow, from creating production orders to recording defects at each operation step. The sequential operation system provides a structured approach to monitoring the manufacturing process, ensuring every step is properly tracked and validated.
              </p>
              <p className="text-gray-700">
                With real-time validation and data quality checks, the system helps prevent errors before they happen. Automated calculations for production metrics provide instant visibility into key performance indicators, helping management make data-driven decisions to improve production efficiency.
              </p>
            </div>
            
            <Separator />
            
            {/* Key Features Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Key Features</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FeatureItem 
                  icon={Workflow} 
                  title="Operation Workflow" 
                  description="Sequential operation tracking through the manufacturing process"
                />
                <FeatureItem 
                  icon={BarChart3} 
                  title="Real-time Analytics" 
                  description="Dashboard analytics for production metrics and defect tracking"
                />
                <FeatureItem 
                  icon={Users} 
                  title="Multi-user Collaboration" 
                  description="Role-based access control for different user types"
                />
                <FeatureItem 
                  icon={ShieldCheck} 
                  title="Data Validation" 
                  description="Built-in validation to ensure data accuracy and consistency"
                />
              </div>
            </div>
            
            <Separator />
            
            {/* Organization Info */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold">Organizations</h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Developer Section */}
                <div className="space-y-3 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Code className="h-5 w-5 text-primary" />Developer
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong>LE CHAMP (South East Asia) Pte Ltd</strong>
                        <a 
                          href="https://www.lechamp.com.sg/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center hover:underline text-sm"
                        >
                          Visit Website <ExternalLinkIcon className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Established in 1982 in Singapore, LE CHAMP specializes in supplying high-quality equipment and components for the electronics and semiconductor industries.
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      Our vision is driven by our philosophy of challenging ourselves to attain infinite heights under honest and dutiful terms, keeping in step with technology through embracing innovation and creativity.
                    </p>
                  </div>
                </div>
                
                {/* Client Section */}
                <div className="space-y-3 p-4 rounded-lg border border-gray-200">
                  <h3 className="text-lg font-medium flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />Client
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong>JAE Philippines</strong>
                        <a 
                          href="https://www.jae.com/en/" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary inline-flex items-center hover:underline text-sm"
                        >
                          Visit Website <ExternalLinkIcon className="ml-1 h-3 w-3" />
                        </a>
                      </div>
                      <p className="mt-2 text-sm text-gray-500">
                        Japan Aviation Electronics Industry, Ltd. (JAE) subsidiary in the Philippines.
                      </p>
                    </div>
                    <p className="text-sm text-gray-600">
                      JAE develops, produces and sells connectors used in various industries including smartphones, automobiles, and industrial equipment, ensuring high-quality and reliable products.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col sm:flex-row gap-4 bg-gray-50 rounded-b-lg pt-6">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard">
                <BarChart3 className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href="https://www.lechamp.com.sg/contact" target="_blank" rel="noopener noreferrer">
                <Users className="mr-2 h-4 w-4" />
                Contact Support
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AboutPage; 