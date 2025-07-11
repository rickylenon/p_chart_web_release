import { useState } from "react";
import { NextPage } from "next";
import Head from "next/head";
import Link from "next/link";
import DashboardLayout from "@/components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";
import { ReactNode } from "react";
import PageHeader from "@/components/layout/PageHeader";
import { Book, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";

const UserManualPage: NextPage = () => {
  const [activeTab, setActiveTab] = useState("getting-started");

  console.log("Rendering user manual page with active tab:", activeTab);

  return (
    <DashboardLayout>
      <Head>
        <title>User Manual | P-Chart System</title>
      </Head>

      <div className="py-6">
        <PageHeader
          title="P-Chart User Manual"
          description="Comprehensive guide for using the P-Chart application"
        />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">User Guide</CardTitle>
            <CardDescription>
              Step-by-step instructions for all features
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Tabs
              defaultValue="getting-started"
              onValueChange={(value) => {
                console.log("Tab changed to:", value);
                setActiveTab(value);
              }}
            >
              <div className="mb-6">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="getting-started">
                    Getting Started
                  </TabsTrigger>
                  <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                  <TabsTrigger value="production-orders">
                    Production Orders
                  </TabsTrigger>
                  <TabsTrigger value="operations">Operations</TabsTrigger>
                  <TabsTrigger value="defects">Defects</TabsTrigger>
                  <TabsTrigger value="edit-requests">Edit Requests</TabsTrigger>
                  <TabsTrigger value="notifications">Notifications</TabsTrigger>
                </TabsList>
              </div>

              {/* Getting Started Section */}
              <TabsContent value="getting-started">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      What is P-Chart?
                    </h2>
                    <p className="text-muted-foreground">
                      P-Chart is a production monitoring and quality control web
                      application designed to help manage production orders,
                      track operations, monitor defects, and generate
                      statistical reports.
                    </p>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">Navigation</h2>
                    <p className="mb-4">
                      The main navigation menu at the top of the application
                      provides access to all major sections:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>
                        <strong>Dashboard</strong> - Overview of key metrics and
                        status
                      </li>
                      <li>
                        <strong>Production Orders</strong> - Management of
                        production orders
                      </li>
                      <li>
                        <strong>Master Defects</strong> - Monitoring and
                        analyzing defects
                      </li>
                      <li>
                        <strong>Reports</strong> - Statistical reports and
                        analytics
                      </li>
                      <li>
                        <strong>Settings</strong> - Application configuration
                      </li>
                    </ul>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      Global Search
                    </h2>
                    <p className="mb-4">
                      The search box in the navigation bar allows you to quickly
                      find production orders:
                    </p>
                    <ol className="list-decimal pl-6 space-y-2">
                      <li>Enter a production order number in the search box</li>
                      <li>Press Enter or click the search icon</li>
                      <li>
                        If the production order exists, you&apos;ll be taken to
                        its details
                      </li>
                      <li>
                        If it doesn&apos;t exist, you&apos;ll be redirected to
                        create a new one with that number
                      </li>
                    </ol>
                  </section>

                  <section>
                    <h2 className="text-xl font-semibold mb-4">User Profile</h2>
                    <p className="mb-4">
                      Access your user profile by clicking on your avatar in the
                      top-right corner:
                    </p>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>View your profile information</li>
                      <li>Access account settings</li>
                      <li>Sign out of the application</li>
                    </ul>
                  </section>
                </div>
              </TabsContent>

              {/* Dashboard Section */}
              <TabsContent value="dashboard">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      Dashboard Overview
                    </h2>
                    <p className="mb-4">
                      The dashboard provides an at-a-glance view of key metrics,
                      recent activities, and status updates. Here you can
                      monitor overall production health and identify areas that
                      need attention.
                    </p>
                  </section>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Key Metrics</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The dashboard displays several key metrics:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Active Production Orders</strong> - Total
                            number of production orders currently in progress
                          </li>
                          <li>
                            <strong>Completed Today</strong> - Number of
                            production orders completed within the last 24 hours
                          </li>
                          <li>
                            <strong>Defect Rate</strong> - The current defect
                            rate across all production orders
                          </li>
                          <li>
                            <strong>On-Time Completion Rate</strong> -
                            Percentage of production orders completed on time
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger>
                        Charts and Visualizations
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The dashboard includes various charts for data
                          visualization:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Production Trend</strong> - Line chart
                            showing production volume over time
                          </li>
                          <li>
                            <strong>Defect Analysis</strong> - Bar chart showing
                            the most common defect types
                          </li>
                          <li>
                            <strong>Completion Status</strong> - Pie chart
                            showing the breakdown of production order statuses
                          </li>
                        </ul>
                        <p className="mt-4">
                          Hover over any chart to see detailed information about
                          specific data points. Click on a chart segment to
                          navigate to the relevant detailed view.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger>Recent Activity</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The Recent Activity section shows the latest updates:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Recently created production orders</li>
                          <li>Status changes to existing orders</li>
                          <li>Recently recorded defects</li>
                          <li>Operation completions</li>
                        </ul>
                        <p className="mt-4">
                          Click on any item in the activity feed to navigate
                          directly to the associated record.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              {/* Production Orders Section */}
              <TabsContent value="production-orders">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      Production Orders Overview
                    </h2>
                    <p className="mb-4">
                      The Production Orders section allows you to create, track,
                      and manage manufacturing orders throughout their
                      lifecycle, from creation to completion.
                    </p>
                  </section>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>
                        Creating a New Production Order
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          To create a new production order:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2">
                          <li>Navigate to the Production Orders page</li>
                          <li>Click the &quot;Create New&quot; button</li>
                          <li>
                            Fill in the required fields:
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>Production Order Number</li>
                              <li>Product Type</li>
                              <li>Quantity</li>
                              <li>Due Date</li>
                              <li>Priority (Optional)</li>
                            </ul>
                          </li>
                          <li>
                            Click &quot;Create&quot; to save the new production
                            order
                          </li>
                        </ol>
                        <p className="mt-4">
                          Once created, the system will automatically generate
                          the required operation steps based on the product type
                          selected.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger>
                        Viewing Production Orders
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The Production Orders page displays a list of all
                          orders with key information:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Production Order Number</li>
                          <li>Status</li>
                          <li>Product Type</li>
                          <li>Created Date</li>
                          <li>Due Date</li>
                          <li>Progress</li>
                        </ul>
                        <p className="mt-4">You can:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            Sort by any column by clicking the column header
                          </li>
                          <li>
                            Filter using the search box or the filter controls
                          </li>
                          <li>
                            Click on any row to view the full details of that
                            production order
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger>Managing Operations</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Each production order consists of multiple operations
                          that must be completed sequentially:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2">
                          <li>
                            Navigate to a specific production order&apos;s
                            detail page
                          </li>
                          <li>
                            The &quot;Operations&quot; tab shows all operations
                            associated with the order
                          </li>
                          <li>
                            Operations are listed in the order they should be
                            performed
                          </li>
                          <li>
                            To start an operation:
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                Click the &quot;Start&quot; button next to the
                                operation
                              </li>
                              <li>
                                The system will record the start time and
                                operator
                              </li>
                            </ul>
                          </li>
                          <li>
                            To complete an operation:
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                Enter the required information (quantity, time,
                                etc.)
                              </li>
                              <li>Record any defects if applicable</li>
                              <li>Click the &quot;Complete&quot; button</li>
                            </ul>
                          </li>
                        </ol>
                        <p className="mt-4">
                          Note: Operations must be completed in sequence. You
                          cannot start an operation until all previous
                          operations have been completed.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                      <AccordionTrigger>Tracking Progress</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Monitor the progress of a production order using these
                          tools:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Progress Bar</strong> - Visual indicator
                            showing overall completion
                          </li>
                          <li>
                            <strong>Timeline View</strong> - Chronological view
                            of all operations and events
                          </li>
                          <li>
                            <strong>Status Badges</strong> - Color-coded
                            indicators showing the status of each operation
                          </li>
                          <li>
                            <strong>Defect Log</strong> - Record of all defects
                            found during production
                          </li>
                        </ul>
                        <p className="mt-4">
                          The system calculates the overall progress based on
                          the number of completed operations relative to the
                          total.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5">
                      <AccordionTrigger>
                        Production Order Locking
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          To prevent multiple users from editing the same
                          production order simultaneously, the system uses a
                          locking mechanism:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            When you open a production order for editing, the
                            system automatically attempts to lock it
                          </li>
                          <li>
                            If successful, you&apos;ll see a lock indicator
                            showing you have exclusive access
                          </li>
                          <li>
                            If someone else has the lock, you&apos;ll see a
                            message indicating who is currently editing it
                          </li>
                          <li>
                            To release your lock, click the &quot;Release
                            Lock&quot; button or navigate away from the page
                          </li>
                          <li>
                            Admin users can force-release locks when necessary
                            by clicking &quot;Force Release Lock&quot;
                          </li>
                        </ul>
                        <p className="mt-4">
                          Always remember to release your lock when you&apos;re
                          done editing to allow others to make changes.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              {/* Operations Section */}
              <TabsContent value="operations">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      Operations Processing
                    </h2>
                    <p className="mb-4">
                      Operations represent individual manufacturing steps within
                      a production order. Each operation has its own workflow,
                      inputs, outputs, and defect tracking.
                    </p>
                  </section>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Operation Workflow</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Each operation follows a standard workflow:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2">
                          <li>
                            <strong>Not Started</strong> - Operation is waiting
                            for previous operations to complete
                          </li>
                          <li>
                            <strong>Start Operation</strong> - Begin the
                            operation and record start time
                          </li>
                          <li>
                            <strong>In Progress</strong> - Operation is
                            underway; defects can be recorded
                          </li>
                          <li>
                            <strong>End Operation</strong> - Complete the
                            operation and record end time
                          </li>
                          <li>
                            <strong>Completed</strong> - Operation is finished;
                            data becomes read-only for regular users
                          </li>
                        </ol>
                        <p className="mt-4">
                          Operations must be completed in sequence. The first
                          operation (OP10) takes its input quantity from the
                          production order total, while subsequent operations
                          use the output from the previous operation as their
                          input.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger>Quantity Flow</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The system automatically manages quantity flow through
                          operations:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Input Quantity</strong> - The starting
                            quantity for the operation
                          </li>
                          <li>
                            <strong>Output Quantity</strong> - Input quantity
                            minus total defects plus replacements
                          </li>
                          <li>
                            <strong>Replacements</strong> - Added components in
                            OP10 that offset defects
                          </li>
                          <li>
                            <strong>Cascading Updates</strong> - Changes to one
                            operation&apos;s output automatically update
                            subsequent operations
                          </li>
                        </ul>
                        <p className="mt-4">
                          Formula: Output Quantity = Input Quantity - Total
                          Defects + Total Replacements
                        </p>
                        <p className="mt-2">
                          When an operation is completed, its output quantity
                          becomes the input quantity for the next operation in
                          sequence.
                        </p>
                        <p className="mt-2">
                          <strong>Note:</strong> Replacement quantities are
                          primarily used for OP10 operations to track when
                          components are replaced during assembly, but can be
                          recorded for any operation.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger>Resource Factor (RF)</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The Resource Factor (RF) is used to track resource
                          utilization:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Default RF value is 1 for all operations</li>
                          <li>
                            Operators can modify RF value when completing an
                            operation
                          </li>
                          <li>
                            RF values affect resource allocation and capacity
                            planning
                          </li>
                          <li>
                            Reports use RF values to calculate overall
                            efficiency
                          </li>
                        </ul>
                        <p className="mt-4">
                          Adjust the RF value to reflect the actual resources
                          used compared to the standard allocation.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                      <AccordionTrigger>Operation Tabs</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The production order details page uses tabs to
                          organize operations:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Tab Navigation</strong> - Each operation has
                            its own tab (OP10, OP20, etc.)
                          </li>
                          <li>
                            <strong>Color Coding</strong> - Green (completed),
                            Blue (in progress), Gray (not started)
                          </li>
                          <li>
                            <strong>Access Control</strong> - Tabs are
                            enabled/disabled based on operation sequence
                          </li>
                          <li>
                            <strong>Summary Tab</strong> - The last tab shows a
                            summary of all operations
                          </li>
                        </ul>
                        <p className="mt-4">
                          Click on a tab to view and manage that specific
                          operation. The system will automatically navigate you
                          to the next operation tab after completing the current
                          one.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              {/* Edit Requests Section */}
              <TabsContent value="edit-requests">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      Defect Edit Request System
                    </h2>
                    <p className="mb-4">
                      The Defect Edit Request system enables users to propose
                      changes to operation defects while maintaining data
                      integrity through an approval workflow.
                    </p>
                  </section>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>
                        Types of Edit Requests
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The system supports three types of defect edit
                          requests:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Add Requests</strong> - Request to add a new
                            defect to an operation
                          </li>
                          <li>
                            <strong>Edit Requests</strong> - Request to modify
                            the quantity of an existing defect
                          </li>
                          <li>
                            <strong>Delete Requests</strong> - Request to remove
                            a defect (by setting quantity to zero)
                          </li>
                        </ul>
                        <p className="mt-4">
                          Each request type follows a similar workflow but
                          captures different information.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger>
                        Creating Edit Requests
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          To create different types of requests:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Add Request:</strong>
                            <ol className="list-decimal pl-6 mt-2 space-y-1">
                              <li>
                                Click &quot;Request Add Defect&quot; in the
                                Operation Defects list
                              </li>
                              <li>
                                Use the searchable list to select a master
                                defect
                              </li>
                              <li>Enter quantity and optional notes</li>
                              <li>Submit the request</li>
                            </ol>
                          </li>
                          <li>
                            <strong>Edit Request:</strong>
                            <ol className="list-decimal pl-6 mt-2 space-y-1">
                              <li>
                                Click on a defect in the Operation Defects list
                              </li>
                              <li>
                                Enter new quantity and optional notes in the
                                popover
                              </li>
                              <li>Submit the request</li>
                            </ol>
                          </li>
                          <li>
                            <strong>Delete Request:</strong>
                            <ol className="list-decimal pl-6 mt-2 space-y-1">
                              <li>
                                Click on a defect in the Operation Defects list
                              </li>
                              <li>Set quantity to zero in the edit popover</li>
                              <li>Confirm the delete request</li>
                              <li>Submit the request</li>
                            </ol>
                          </li>
                        </ul>
                        <p className="mt-4">
                          After submission, a notification is sent to admin
                          users for review.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger>
                        Reviewing Requests (Admin)
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Administrators can review requests through two
                          interfaces:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Pending Defect Requests Modal:</strong>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                Shows pending requests for a specific operation
                              </li>
                              <li>Accessed from the operation details page</li>
                            </ul>
                          </li>
                          <li>
                            <strong>
                              Operation Defects Edit Requests Page:
                            </strong>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>Shows all requests with filtering options</li>
                              <li>Accessed from the admin menu</li>
                            </ul>
                          </li>
                        </ul>
                        <p className="mt-4">The review interface displays:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            Request type and status with color-coded badges
                          </li>
                          <li>Original and requested quantities</li>
                          <li>Timestamps for creation and resolution</li>
                          <li>Requester information and notes</li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                      <AccordionTrigger>
                        Resolving Requests (Admin)
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Administrators can take the following actions:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Approve</strong> - Accept the changes and
                            apply them to the database
                          </li>
                          <li>
                            <strong>Reject</strong> - Decline the changes,
                            keeping original data intact
                          </li>
                          <li>
                            <strong>Add Resolution Notes</strong> - Provide
                            explanation for the decision
                          </li>
                        </ul>
                        <p className="mt-4">After resolution:</p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            Request status updates to &apos;approved&apos; or
                            &apos;rejected&apos;
                          </li>
                          <li>
                            Resolution timestamp and resolver information are
                            recorded
                          </li>
                          <li>A notification is sent to the requester</li>
                          <li>
                            If approved, the defect data is updated accordingly
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5">
                      <AccordionTrigger>Best Practices</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Follow these guidelines for effective use of the edit
                          request system:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Adding New Defects:</strong>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                Check if the defect already exists in the
                                operation
                              </li>
                              <li>
                                Use the search functionality to find the correct
                                master defect
                              </li>
                            </ul>
                          </li>
                          <li>
                            <strong>Editing Defects:</strong>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                Provide clear notes explaining the reason for
                                the change
                              </li>
                              <li>
                                Use delete requests (quantity zero) only when
                                the defect should be completely removed
                              </li>
                            </ul>
                          </li>
                          <li>
                            <strong>Reviewing Requests:</strong>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                Review the complete context including operation
                                details
                              </li>
                              <li>
                                Provide detailed resolution notes to help users
                                understand decisions
                              </li>
                              <li>
                                Process requests promptly to maintain workflow
                                efficiency
                              </li>
                            </ul>
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              {/* Notifications Section */}
              <TabsContent value="notifications">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      Notification System
                    </h2>
                    <p className="mb-4">
                      The notification system keeps you informed about important
                      events and actions that require your attention.
                    </p>
                  </section>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>
                        Types of Notifications
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The system supports different notification types:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>System Notifications</strong> -
                            Application-wide announcements and maintenance
                            alerts
                          </li>
                          <li>
                            <strong>Message Notifications</strong> - Direct
                            messages and team announcements
                          </li>
                          <li>
                            <strong>Defect Edit Notifications</strong> - Changes
                            to defect status and edit request updates
                          </li>
                        </ul>
                        <p className="mt-4">
                          Each notification type has a distinct visual indicator
                          for easy identification.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger>
                        Accessing Notifications
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          You can access your notifications in multiple ways:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Notification Badge</strong> - Shows unread
                            count in the navigation bar
                          </li>
                          <li>
                            <strong>Notification Dropdown</strong> - Quick view
                            of recent notifications
                          </li>
                          <li>
                            <strong>Notifications Page</strong> - Comprehensive
                            view of all notifications
                          </li>
                        </ul>
                        <p className="mt-4">
                          Click on the bell icon in the navigation bar to see
                          your most recent notifications, or navigate to the
                          Notifications page for a complete history.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger>
                        Managing Notifications
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          You can manage your notifications with these tools:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Mark as Read</strong> - Click on a
                            notification to mark it as read
                          </li>
                          <li>
                            <strong>Mark All as Read</strong> - Button to mark
                            all notifications as read
                          </li>
                          <li>
                            <strong>Filter by Type</strong> - Filter
                            notifications by category
                          </li>
                          <li>
                            <strong>Search</strong> - Search notifications by
                            content
                          </li>
                        </ul>
                        <p className="mt-4">
                          Notifications are automatically marked as read when
                          you click on them and navigate to the related content.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                      <AccordionTrigger>
                        Notification Detail Modal
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          When clicking on a notification, a detail modal shows:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Complete notification message (not truncated)</li>
                          <li>Timestamp and type information</li>
                          <li>Source reference ID</li>
                          <li>
                            Action buttons for navigating to linked content
                          </li>
                        </ul>
                        <p className="mt-4">
                          The modal provides all context needed to understand
                          the notification and take appropriate action.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5">
                      <AccordionTrigger>Direct Navigation</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Notifications provide direct navigation to relevant
                          content:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            Click on a notification to navigate to the
                            associated page
                          </li>
                          <li>
                            URL hash parameters point to specific content (e.g.,
                            a particular edit request)
                          </li>
                          <li>
                            The system automatically scrolls to highlight the
                            relevant item
                          </li>
                        </ul>
                        <p className="mt-4">
                          Example: Clicking a defect edit request notification
                          takes you directly to that specific request in the
                          list.
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>

              {/* Defects Section */}
              <TabsContent value="defects">
                <div className="space-y-6">
                  <section>
                    <h2 className="text-xl font-semibold mb-4">
                      Defects Management
                    </h2>
                    <p className="mb-4">
                      The Defects Management system allows you to record, track,
                      and analyze quality issues found during production. This
                      helps identify patterns and improve quality control.
                    </p>
                  </section>

                  <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="item-1">
                      <AccordionTrigger>Recording Defects</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Defects can be recorded in two ways:
                        </p>
                        <ol className="list-decimal pl-6 space-y-2">
                          <li>
                            <strong>During Operation Completion:</strong>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                When completing an operation, click &quot;Add
                                Defect&quot;
                              </li>
                              <li>
                                Select the defect type from the master list
                              </li>
                              <li>Enter the quantity affected</li>
                              <li>
                                For reworkable defects, specify the No-Good (NG)
                                quantity
                              </li>
                              <li>
                                The system automatically calculates Rework (RW)
                                as Total - NG
                              </li>
                              <li>Add any notes or comments</li>
                              <li>Submit with the operation completion</li>
                            </ul>
                          </li>
                          <li>
                            <strong>From the Defects Tab:</strong>
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>
                                Navigate to the &quot;Defects&quot; tab within a
                                production order
                              </li>
                              <li>Click &quot;Record New Defect&quot;</li>
                              <li>Select the associated operation</li>
                              <li>Choose the defect type</li>
                              <li>
                                Enter quantity, NG quantity, and any notes
                              </li>
                              <li>Click &quot;Save&quot;</li>
                            </ul>
                          </li>
                        </ol>
                        <p className="mt-4">
                          The system automatically updates the operation output
                          quantity based on defects recorded.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-2">
                      <AccordionTrigger>Master Defects List</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The Master Defects section maintains a catalog of all
                          possible defect types:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            Navigate to the &quot;Master Defects&quot; section
                            from the main menu
                          </li>
                          <li>View all defect categories and types</li>
                          <li>
                            Each defect includes:
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>Name and unique ID</li>
                              <li>
                                Category (e.g., Material, Process, Tooling)
                              </li>
                              <li>
                                Reworkable status (whether defects can be fixed)
                              </li>
                              <li>Machine association (if applicable)</li>
                              <li>Active/Inactive status</li>
                            </ul>
                          </li>
                          <li>Search or filter the list as needed</li>
                          <li>
                            To add a new defect type (admin only):
                            <ul className="list-disc pl-6 mt-2 space-y-1">
                              <li>Click &quot;Add New Defect Type&quot;</li>
                              <li>Enter the name, category, and description</li>
                              <li>Specify whether it&apos;s reworkable</li>
                              <li>
                                Associate with specific machines if applicable
                              </li>
                              <li>Click &quot;Save&quot;</li>
                            </ul>
                          </li>
                        </ul>
                        <p className="mt-4">
                          Master defects are never deleted - they are only
                          deactivated by setting &quot;isActive&quot; to false
                          to preserve data integrity for historical records.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-3">
                      <AccordionTrigger>Defect Analysis</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Analyze defect patterns and trends:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Defect Summary View:</strong> Shows defect
                            counts by type for a production order
                          </li>
                          <li>
                            <strong>Defect Rate Calculation:</strong> Percentage
                            of defects relative to production quantity
                          </li>
                          <li>
                            <strong>Pareto Charts:</strong> Visual
                            representation of the most common defects
                          </li>
                          <li>
                            <strong>Trend Analysis:</strong> How defect rates
                            change over time
                          </li>
                          <li>
                            <strong>Category Breakdown:</strong> Distribution of
                            defects by category
                          </li>
                          <li>
                            <strong>Machine Analysis:</strong> Defect rates by
                            machine
                          </li>
                        </ul>
                        <p className="mt-4">
                          Use these tools to identify the most impactful quality
                          issues and prioritize improvement efforts.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-4">
                      <AccordionTrigger>
                        Reworkable vs. No-Good Defects
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The system distinguishes between two types of
                          defective units:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Reworkable (RW):</strong> Defective units
                            that can be fixed and returned to production
                          </li>
                          <li>
                            <strong>No-Good (NG):</strong> Defective units that
                            cannot be fixed and must be scrapped
                          </li>
                        </ul>
                        <p className="mt-4">
                          For each defect entry, you need to specify:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Total Quantity:</strong> All units affected
                            by this defect
                          </li>
                          <li>
                            <strong>NG Quantity:</strong> Units that cannot be
                            reworked
                          </li>
                        </ul>
                        <p className="mt-4">
                          The system automatically calculates:
                        </p>
                        <p className="pl-6">
                          RW Quantity = Total Quantity - NG Quantity
                        </p>
                        <p className="mt-4">
                          Only the NG quantity affects the output quantity of an
                          operation. Reworkable defects are tracked but
                          don&apos;t reduce the output since they can be fixed
                          and continue in the process.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-5">
                      <AccordionTrigger>
                        Defect Impact on Quantity Flow
                      </AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          Defects directly impact the quantity flow through
                          operations:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            Each operation has an input quantity (from previous
                            operation)
                          </li>
                          <li>Defects reduce the effective output quantity</li>
                          <li>
                            The formula is: Output Quantity = Input Quantity -
                            Total NG Defects
                          </li>
                          <li>
                            The output quantity becomes the input for the next
                            operation
                          </li>
                          <li>
                            Changes to defect quantities automatically propagate
                            through the operation chain
                          </li>
                        </ul>
                        <p className="mt-4">
                          This ensures accurate tracking of quantities
                          throughout the production process and provides
                          visibility into where losses occur.
                        </p>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="item-6">
                      <AccordionTrigger>Defect Data Structure</AccordionTrigger>
                      <AccordionContent>
                        <p className="mb-4">
                          The system uses two related entities for defect
                          management:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>
                            <strong>Master Defects:</strong> The catalog of all
                            possible defect types
                          </li>
                          <li>
                            <strong>Operation Defects:</strong> Specific
                            instances of defects recorded in operations
                          </li>
                        </ul>
                        <p className="mt-4">
                          Operation Defects reference Master Defects using
                          defect IDs rather than names, which provides:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                          <li>Better data integrity and consistency</li>
                          <li>
                            Ability to rename defects without breaking
                            references
                          </li>
                          <li>Improved performance for searches and queries</li>
                          <li>
                            Support for defect categorization and filtering
                          </li>
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-4 bg-gray-50 dark:bg-gray-800 rounded-b-lg pt-6">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/dashboard">
                <Book className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/profile/support">
                <LifeBuoy className="mr-2 h-4 w-4" />
                Contact Support
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserManualPage;
