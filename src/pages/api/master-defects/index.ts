import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

interface MasterDefect {
  id: string;
  name: string;
  category: string;
  reworkable: boolean;
}

interface MasterDefectWithQuantity extends MasterDefect {
  quantity: number;
  quantityRework: number;
  quantityNogood: number;
}

// Define valid operation keys
type OperationKey = "op10" | "op15" | "op20" | "op30" | "op40";

// Mock master defect data
// In a real implementation, this would come from a database
const masterDefects: Record<OperationKey, MasterDefect[]> = {
  op10: [
    {
      id: "1",
      name: "Cable Wound",
      category: "Cable Cutting",
      reworkable: true,
    },
    {
      id: "2",
      name: "Damaged Cable",
      category: "Cable Cutting",
      reworkable: false,
    },
    {
      id: "3",
      name: "Dent on Cable",
      category: "Cable Cutting",
      reworkable: true,
    },
    {
      id: "4",
      name: "Dropped Product",
      category: "Cable Cutting",
      reworkable: false,
    },
    { id: "5", name: "Line Mark", category: "Cable Cutting", reworkable: true },
    {
      id: "6",
      name: "Out of Specs (Cable / Product Length)",
      category: "Cable Cutting",
      reworkable: false,
    },
    {
      id: "7",
      name: "Shave Flaw",
      category: "Cable Cutting",
      reworkable: true,
    },
    {
      id: "8",
      name: "Stain on cable",
      category: "Cable Cutting",
      reworkable: true,
    },
  ],
  op15: [
    {
      id: "9",
      name: "Bent Pin",
      category: "1st Side Process",
      reworkable: true,
    },
    {
      id: "10",
      name: "Cracked Housing",
      category: "1st Side Process",
      reworkable: false,
    },
    {
      id: "11",
      name: "Cold Solder",
      category: "1st Side Process",
      reworkable: true,
    },
    {
      id: "12",
      name: "Missing Pin",
      category: "1st Side Process",
      reworkable: false,
    },
  ],
  op20: [
    {
      id: "13",
      name: "Bent Pin",
      category: "2nd Side Process",
      reworkable: true,
    },
    {
      id: "14",
      name: "Cracked Housing",
      category: "2nd Side Process",
      reworkable: false,
    },
    {
      id: "15",
      name: "Cold Solder",
      category: "2nd Side Process",
      reworkable: true,
    },
    {
      id: "16",
      name: "Missing Pin",
      category: "2nd Side Process",
      reworkable: false,
    },
  ],
  op30: [
    {
      id: "17",
      name: "Improper Taping",
      category: "Taping Process",
      reworkable: true,
    },
    {
      id: "18",
      name: "Tape Misalignment",
      category: "Taping Process",
      reworkable: true,
    },
    {
      id: "19",
      name: "Tape Tear",
      category: "Taping Process",
      reworkable: false,
    },
    {
      id: "20",
      name: "Air Bubble",
      category: "Taping Process",
      reworkable: true,
    },
  ],
  op40: [
    {
      id: "21",
      name: "Dimension Out of Spec",
      category: "QC Sampling",
      reworkable: false,
    },
    {
      id: "22",
      name: "Electrical Test Failure",
      category: "QC Sampling",
      reworkable: false,
    },
    {
      id: "23",
      name: "Visual Inspection Failure",
      category: "QC Sampling",
      reworkable: true,
    },
    {
      id: "24",
      name: "Missing Component",
      category: "QC Sampling",
      reworkable: false,
    },
  ],
};

const handler = async (
  req: NextApiRequest,
  res: NextApiResponse,
  session: any
) => {
  try {
    console.log(
      "API: MasterDefects index auth session validated, user:",
      session?.user?.name
    );

    console.log("MasterDefects API called");

    if (req.method === "GET") {
      const {
        operation,
        poNumber,
        category,
        active,
        search,
        page = "1",
        limit = "20",
        sortField = "name",
        sortDirection = "asc",
      } = req.query;

      console.log(`Fetching master defects with params:`, {
        operation,
        poNumber,
        category,
        active,
        search,
        page,
        limit,
        sortField,
        sortDirection,
      });

      // Parse pagination parameters
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Base query filters
      const where: any = {};

      // Add filters if provided
      if (operation && typeof operation === "string") {
        where.applicableOperation = operation.toUpperCase();
      }

      if (category && typeof category === "string") {
        where.category = category;
      }

      if (active === "true") {
        where.isActive = true;
      } else if (active === "false") {
        where.isActive = false;
      }

      // Add search filter if provided
      if (search && typeof search === "string" && search.trim() !== "") {
        const searchTerm = search.trim();
        console.log(`Using search term: "${searchTerm}"`);

        // For SQLite, we need to create OR conditions with LIKE operators
        // Build a raw query component for each field we want to search
        where.OR = [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { category: { contains: searchTerm } },
          { applicableOperation: { contains: searchTerm } },
          { machine: { contains: searchTerm } },
        ];

        console.log("Search filter applied with OR conditions");
      }

      // Validate sort field and direction
      const allowedSortFields = [
        "name",
        "category",
        "applicableOperation",
        "machine",
        "reworkable",
        "isActive",
      ];
      const actualSortField = allowedSortFields.includes(sortField as string)
        ? (sortField as string)
        : "name";

      const actualSortDirection = sortDirection === "desc" ? "desc" : "asc";

      // Build the order by configuration
      const orderBy: any = {};
      orderBy[actualSortField] = actualSortDirection;

      // Get total count for pagination
      const totalCount = await prisma.masterDefect.count({ where });

      // Fetch master defects from database with pagination
      const masterDefects = await prisma.masterDefect.findMany({
        where,
        orderBy: [
          orderBy,
          { category: "asc" }, // Secondary sort
          { name: "asc" }, // Tertiary sort
        ],
        skip,
        take: limitNum,
      });

      console.log(
        `Found ${
          masterDefects.length
        } master defects (page ${pageNum} of ${Math.ceil(
          totalCount / limitNum
        )})`
      );

      // If operation and poNumber are provided, get master defect quantities
      if (
        operation &&
        poNumber &&
        typeof operation === "string" &&
        typeof poNumber === "string"
      ) {
        console.log(
          `Looking for saved master defect quantities for PO: ${poNumber}`
        );

        // Get the related operation for this PO and operation code
        const operationRecord = await prisma.operation.findFirst({
          where: {
            productionOrder: {
              poNumber: poNumber,
            },
            operation: operation.toUpperCase(),
          },
          include: {
            operationDefects: true,
          },
        });

        if (operationRecord && operationRecord.operationDefects.length > 0) {
          console.log(
            `Found ${operationRecord.operationDefects.length} saved master defects for this operation`
          );

          // Update quantities in our master defects list
          const masterDefectsWithQuantities = masterDefects.map(
            (masterDefect) => {
              // Find matching operation defect if it exists
              const savedMasterDefect = operationRecord.operationDefects.find(
                (od: any) => od.defectName === masterDefect.name
              );

              if (savedMasterDefect) {
                console.log(
                  `Applying saved quantities for master defect: ${masterDefect.name}, QTY: ${savedMasterDefect.quantity}, RW: ${savedMasterDefect.quantityRework}, NG: ${savedMasterDefect.quantityNogood}`
                );
                return {
                  ...masterDefect,
                  quantity: savedMasterDefect.quantity,
                  quantityRework: savedMasterDefect.quantityRework,
                  quantityNogood: savedMasterDefect.quantityNogood,
                };
              }

              return {
                ...masterDefect,
                quantity: 0,
                quantityRework: 0,
                quantityNogood: 0,
              };
            }
          );

          // Prepare paginated response
          const paginatedResponse = {
            data: masterDefectsWithQuantities,
            page: pageNum,
            limit: limitNum,
            total: totalCount,
            totalPages: Math.ceil(totalCount / limitNum),
          };

          console.log(`Returning paginated master defects with quantities`);
          return res.status(200).json(paginatedResponse);
        }

        // If no operation defects found, add zero quantities
        const masterDefectsWithZeroQuantities = masterDefects.map(
          (masterDefect) => ({
            ...masterDefect,
            quantity: 0,
            quantityRework: 0,
            quantityNogood: 0,
          })
        );

        // Prepare paginated response
        const paginatedResponse = {
          data: masterDefectsWithZeroQuantities,
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        };

        console.log(`Returning paginated master defects with zero quantities`);
        return res.status(200).json(paginatedResponse);
      }

      // Return paginated master defects without quantities
      const paginatedResponse = {
        data: masterDefects,
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum),
      };

      console.log(`Returning paginated master defects without quantities`);
      return res.status(200).json(paginatedResponse);
    } else if (req.method === "POST") {
      try {
        // Parse request body
        const data =
          typeof req.body === "string" ? JSON.parse(req.body) : req.body;
        console.log("Creating new master defect with data:", data);

        const {
          name,
          description,
          category,
          applicableOperation,
          reworkable,
          machine,
        } = data;

        if (!name || !category || !applicableOperation) {
          return res.status(400).json({
            error: "Name, category, and applicable operation are required",
          });
        }

        // Check if a master defect with the same name and applicable operation already exists
        const existingMasterDefect = await prisma.masterDefect.findFirst({
          where: {
            name,
            applicableOperation,
          },
        });

        if (existingMasterDefect) {
          return res.status(409).json({
            error:
              "A master defect with this name and applicable operation already exists",
          });
        }

        // Create the new master defect
        const newMasterDefect = await prisma.masterDefect.create({
          data: {
            name,
            description,
            category,
            applicableOperation,
            reworkable: reworkable || false,
            machine,
            isActive: true,
          },
        });

        console.log(`Created new master defect with ID: ${newMasterDefect.id}`);
        return res.status(201).json(newMasterDefect);
      } catch (error) {
        console.error("Error creating master defect:", error);
        return res.status(500).json({
          error: "Failed to create master defect",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Method not supported
    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    console.error("Error in handler:", error);
    return res.status(500).json({ error: "Failed to process request" });
  }
};

export default withAuth(handler);
