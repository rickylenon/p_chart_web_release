import 'package:sqflite_common_ffi/sqflite_ffi.dart'
    show Database, databaseFactoryFfi, sqfliteFfiInit;
import 'package:path/path.dart';
import 'package:sqflite/sqflite.dart' hide DatabaseFactory;
import '../models/user.dart';
import '../models/production_order.dart';
import '../models/operation.dart';
import '../models/defect.dart';
import '../models/operation_defect.dart';
import 'package:sqflite_common/sqlite_api.dart' show OpenDatabaseOptions;
import 'dart:io';
import 'dart:math';
import 'dart:typed_data' show ByteData;
import 'audit_service.dart';
import 'auth_service.dart';
import 'package:flutter/services.dart' show rootBundle;
import 'package:path_provider/path_provider.dart';
import 'dart:ffi';
import 'package:sqlite3/sqlite3.dart' as sqlite3;
import 'package:sqlite3/open.dart';
import 'package:excel/excel.dart';

// Initialize FFI
void initializeSqflite() {
  if (Platform.isWindows) {
    // Try to load SQLite from the application directory first
    final exePath = Platform.resolvedExecutable;
    final appDir = dirname(exePath);
    final sqlitePath = join(appDir, 'sqlite3.dll');

    if (File(sqlitePath).existsSync()) {
      // Set the custom SQLite loading mechanism
      open.overrideFor(OperatingSystem.windows, () {
        return DynamicLibrary.open(sqlitePath);
      });
    }
    // Initialize FFI
    sqfliteFfiInit();
  } else {
    sqfliteFfiInit();
  }

  // Set database path
  var path = Directory.current.path;
  if (Platform.isWindows) {
    path = join(path, 'data');
    // Create the data directory if it doesn't exist
    Directory(path).createSync(recursive: true);
  }
  databaseFactoryFfi.setDatabasesPath(path);
}

class ProductionOrderResult {
  final List<ProductionOrder> orders;
  final int total;

  ProductionOrderResult({required this.orders, required this.total});
}

class DatabaseService {
  static final DatabaseService _instance = DatabaseService._internal();
  static Database? _database;
  late final databaseFactory = databaseFactoryFfi;
  AuditService? _auditService;

  factory DatabaseService() => _instance;

  DatabaseService._internal() {
    initializeSqflite();
  }

  void setAuditService(AuditService auditService) {
    _auditService = auditService;
  }

  AuditService? get auditService => _auditService;

  Future<void> deleteDatabase() async {
    final dbPath = await databaseFactory.getDatabasesPath();
    final path = join(dbPath, 'p_chart_system.db');
    await databaseFactory.deleteDatabase(path);
    _database = null;
  }

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    await _initializeOperationSteps();
    return _database!;
  }

  Future<Database> _initDatabase() async {
    final dbPath = await databaseFactory.getDatabasesPath();
    final path = join(dbPath, 'p_chart_system.db');

    print('Opening database at path: $path');

    return await databaseFactory.openDatabase(
      path,
      options: OpenDatabaseOptions(
        version: 6,
        onCreate: _createDb,
        onUpgrade: _onUpgrade,
      ),
    );
  }

  Future<void> _createDb(Database db, int version) async {
    // Create users table
    await db.execute('''
      CREATE TABLE users(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'Encoder',
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL
      )
    ''');

    // Create production_orders table
    await db.execute('''
      CREATE TABLE production_orders(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        po_number TEXT UNIQUE NOT NULL,
        lot_number TEXT,
        po_quantity INTEGER NOT NULL,
        item_name TEXT,
        status TEXT NOT NULL,
        current_operation TEXT,
        current_operation_start_time TEXT,
        current_operation_end_time TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    ''');

    // Create defects table
    await db.execute('''
      CREATE TABLE defects(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        applicable_operation TEXT,
        reworkable INTEGER,
        machine TEXT
      )
    ''');

    // Create operations table first (before operation_defects)
    await db.execute('''
      CREATE TABLE operations(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        production_order_id INTEGER NOT NULL,
        operation TEXT NOT NULL,
        operator_id INTEGER,
        start_time TEXT,
        end_time TEXT,
        input_quantity INTEGER NOT NULL,
        output_quantity INTEGER,
        production_hours REAL,
        accumulated_man_hours REAL,
        rf INTEGER,
        encoded_by_id INTEGER,
        encoded_time TEXT,
        FOREIGN KEY (production_order_id) REFERENCES production_orders (id),
        FOREIGN KEY (operator_id) REFERENCES users (id),
        FOREIGN KEY (encoded_by_id) REFERENCES users (id)
      )
    ''');

    // Create operation_defects table after operations table
    await db.execute('''
      CREATE TABLE operation_defects(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_id INTEGER NOT NULL,
        defect_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 0,
        quantity_rework INTEGER DEFAULT 0,
        quantity_nogood INTEGER DEFAULT 0,
        FOREIGN KEY (operation_id) REFERENCES operations (id),
        FOREIGN KEY (defect_id) REFERENCES defects (id),
        UNIQUE(operation_id, defect_id)
      )
    ''');

    // Create audit_logs table
    await db.execute('''
      CREATE TABLE audit_logs(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        old_values TEXT,
        new_values TEXT,
        user_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )
    ''');

    // Create operation_steps table
    await db.execute('''
      CREATE TABLE operation_steps(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        operation_number TEXT NOT NULL UNIQUE,
        step_order INTEGER NOT NULL
      )
    ''');

    // Insert default operation steps
    for (var step in OperationStep.defaultSteps) {
      await db.insert('operation_steps', {
        'label': step.label,
        'operation_number': step.operationNumber,
        'step_order': step.index,
      });
    }

    // Insert default admin user
    await db.insert('users', {
      'username': 'admin',
      'password': '1234', // In production, use proper password hashing
      'name': 'Administrator',
      'email': 'admin@example.com',
      'role': 'Admin',
      'is_active': 1,
      'created_at': DateTime.now().toIso8601String(),
    });

    // Insert default encoder user
    await db.insert('users', {
      'username': 'encoder',
      'password': '1234', // In production, use proper password hashing
      'name': 'Encoder',
      'email': 'admin@example.com',
      'role': 'Encoder',
      'is_active': 1,
      'created_at': DateTime.now().toIso8601String(),
    });

    // Populate default defects using the provided db instance
    await _populateDefaultDefects(db);
  }

  Future<void> _populateDefaultDefects(Database db) async {
    print('Starting to populate default defects...');

    // First, clean up existing defects
    await db.delete('defects');
    await db.delete('operation_defects');
    print('Cleaned up existing defects');

    try {
      // Read the XLSX file from assets
      print('Attempting to read XLSX from assets...');
      final ByteData data =
          await rootBundle.load('assets/defects_masterlist.xlsx');
      final bytes = data.buffer.asUint8List();

      // Use excel package to read XLSX
      final excel = Excel.decodeBytes(bytes);
      final sheet = excel.tables[excel.tables.keys.first];

      if (sheet == null) {
        print('No sheet found in XLSX file');
        return;
      }

      print('Successfully read XLSX data. Rows: ${sheet.maxRows}');

      var insertedCount = 0;
      // Skip header row
      for (var i = 1; i < sheet.maxRows; i++) {
        final row = sheet.row(i);
        if (row.isEmpty) {
          print('Skipping empty row at index $i');
          continue;
        }

        try {
          final category = row[0]?.value?.toString().trim() ?? '';
          final operation = row[1]?.value?.toString().trim() ?? '';
          final name = row[2]?.value?.toString().trim() ?? '';
          final reworkable = row[3]?.value?.toString().trim() == '1';
          final machine = row[4]?.value?.toString().trim();

          if (name.isEmpty) {
            print('Skipping row $i: name is empty');
            continue;
          }

          final defectMap = {
            'name': name,
            'category': category,
            'description': '$name in category $category',
            'applicable_operation': operation,
            'reworkable': reworkable ? 1 : 0,
            'machine': machine?.isEmpty == true ? null : machine,
          };

          print('Inserting defect: $defectMap');
          await db.insert('defects', defectMap);
          insertedCount++;
        } catch (e) {
          print('Error inserting defect at row $i: $e');
        }
      }

      print('Successfully inserted $insertedCount defects');

      // Verify the inserts
      final count = Sqflite.firstIntValue(
          await db.rawQuery('SELECT COUNT(*) FROM defects'));
      print('Total defects in database: $count');
    } catch (e, stackTrace) {
      print('Error loading defects from XLSX: $e');
      print('Stack trace: $stackTrace');
      print('Falling back to empty defects list');
    }
  }

  // Public method to repopulate defects if needed
  Future<void> populateDefaultDefects() async {
    final db = await database;
    await _populateDefaultDefects(db);
  }

  Future<User?> authenticateUser(String username, String password) async {
    final Database db = await database;

    try {
      final List<Map<String, dynamic>> maps = await db.query(
        'users',
        where: 'LOWER(username) = LOWER(?) AND password = ? AND is_active = 1',
        whereArgs: [username, password],
      );

      if (maps.isEmpty) return null;

      final userData = maps.first;
      // Ensure all required fields are present
      return User(
        id: userData['id'] as int,
        username: userData['username'] as String,
        password: userData['password'] as String,
        name: userData['name'] as String?,
        email: userData['email'] as String?,
        role: userData['role'] as String? ?? 'Encoder',
        isActive: userData['is_active'] == 1,
        createdAt: DateTime.parse(userData['created_at'] as String),
      );
    } catch (e) {
      print('Authentication error: $e');
      return null;
    }
  }

  Future<bool> isUsernameAvailable(String username) async {
    final Database db = await database;

    final List<Map<String, dynamic>> maps = await db.query(
      'users',
      where: 'LOWER(username) = LOWER(?)',
      whereArgs: [username],
    );

    return maps.isEmpty;
  }

  Future<void> updateUser(User user) async {
    final Database db = await database;

    try {
      // Get current user data for audit
      final List<Map<String, dynamic>> currentData = await db.query(
        'users',
        where: 'id = ?',
        whereArgs: [user.id],
      );

      // Create update map with only the fields we want to update
      final map = {
        'name': user.name,
        'email': user.email,
        'password': user.password,
        'role': user.role,
        'is_active': user.isActive ? 1 : 0,
      };

      await db.update(
        'users',
        map,
        where: 'id = ?',
        whereArgs: [user.id],
      );

      // Log the change
      if (_auditService != null && currentData.isNotEmpty) {
        await _auditService!.logChange(
          tableName: 'users',
          recordId: user.id,
          action: AuditAction.update,
          oldValues: currentData.first,
          newValues: {...currentData.first, ...map},
        );
      }
    } catch (e) {
      print('Update user error: $e');
      rethrow;
    }
  }

  // Production Orders
  Future<ProductionOrderResult> getProductionOrders({
    int offset = 0,
    int limit = 10,
    String searchQuery = '',
    String? sortColumn,
    bool sortAscending = true,
  }) async {
    final db = await database;

    String whereClause = '';
    List<dynamic> whereArgs = [];

    if (searchQuery.isNotEmpty) {
      whereClause = '''
        po_number LIKE ? OR 
        lot_number LIKE ? OR 
        item_name LIKE ?
      ''';
      whereArgs = [
        '%$searchQuery%',
        '%$searchQuery%',
        '%$searchQuery%',
      ];
    }

    // Get total count
    final countResult = await db.rawQuery(
      'SELECT COUNT(*) as count FROM production_orders ${whereClause.isNotEmpty ? 'WHERE $whereClause' : ''}',
      whereArgs,
    );
    final total =
        countResult.isNotEmpty ? countResult.first['count'] as int : 0;

    // Get paginated results
    String orderBy = '';
    if (sortColumn != null) {
      orderBy = '$sortColumn ${sortAscending ? 'ASC' : 'DESC'}';
    }

    final List<Map<String, dynamic>> maps = await db.query(
      'production_orders',
      where: whereClause.isEmpty ? null : whereClause,
      whereArgs: whereArgs.isEmpty ? null : whereArgs,
      orderBy: orderBy.isEmpty ? null : orderBy,
      limit: limit,
      offset: offset,
    );

    return ProductionOrderResult(
      orders: maps.map((map) => ProductionOrder.fromMap(map)).toList(),
      total: total,
    );
  }

  Future<void> createOperationsForPO(ProductionOrder order) async {
    if (order.id == null) {
      throw Exception('Production order ID is required');
    }

    final db = await database;

    // Create operations for each step
    for (var step in OperationStep.values) {
      // For first operation, use PO quantity as input
      // For subsequent operations, input quantity will be set when previous operation completes
      final inputQuantity = step == OperationStep.OP10
          ? order.poQuantity
          : 0; // Will be set when previous operation completes

      final operation = Operation(
        productionOrderId: order.id!,
        operation: step,
        inputQuantity: inputQuantity,
      );

      await db.insert('operations', operation.toMap());
    }
  }

  Future<ProductionOrder> createProductionOrder(ProductionOrder order) async {
    final db = await database;
    final id = await db.insert('production_orders', order.toMap());

    final createdOrder = ProductionOrder(
      id: id,
      poNumber: order.poNumber,
      lotNumber: order.lotNumber,
      poQuantity: order.poQuantity,
      itemName: order.itemName,
      status: order.status,
      currentOperation: order.currentOperation,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    );

    // Create all operations for this PO
    await createOperationsForPO(createdOrder);

    // Log the creation
    if (_auditService != null) {
      await _auditService!.logChange(
        tableName: 'production_orders',
        recordId: id,
        action: AuditAction.create,
        newValues: createdOrder.toMap(),
      );
    }

    return createdOrder;
  }

  // Operations
  Future<Operation> createOperation(Operation operation) async {
    final db = await database;
    final id = await db.insert('operations', operation.toMap());
    return operation;
  }

  Future<List<Operation>> getOperationsForPO(int productionOrderId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'operations',
      where: 'production_order_id = ?',
      whereArgs: [productionOrderId],
    );
    return List.generate(maps.length, (i) => Operation.fromMap(maps[i]));
  }

  // Defects
  Future<List<Defect>> getDefectsForOperation(OperationStep operation) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'defects',
      where: 'applicable_operation = ?',
      whereArgs: [operation.name],
    );

    // Ensure all defects have IDs
    final defects = List.generate(maps.length, (i) => Defect.fromMap(maps[i]));
    return defects.where((d) => d.id != null).toList();
  }

  Future<ProductionOrder?> findProductionOrder(String poNumber) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'production_orders',
      where: 'po_number = ?',
      whereArgs: [poNumber],
    );

    if (maps.isEmpty) return null;
    return ProductionOrder.fromMap(maps.first);
  }

  Future<void> updateProductionOrder(ProductionOrder order) async {
    final db = await database;

    // Get current data for audit
    final List<Map<String, dynamic>> currentData = await db.query(
      'production_orders',
      where: 'id = ?',
      whereArgs: [order.id],
    );

    // Get all operations to determine current operation and timing
    final operations = await getOperationsForPO(order.id!);

    // Sort operations by their step order
    final sortedOperations = operations.toList()
      ..sort((a, b) => a.operation.index.compareTo(b.operation.index));

    // Find the current operation and its timing
    Operation? currentOp;
    for (final op in sortedOperations) {
      if (op.startTime != null && op.endTime == null) {
        // Found in-progress operation
        currentOp = op;
        break;
      }
    }

    if (currentOp == null && sortedOperations.isNotEmpty) {
      // If no in-progress operation, find last completed operation
      for (var i = sortedOperations.length - 1; i >= 0; i--) {
        if (sortedOperations[i].endTime != null) {
          currentOp = sortedOperations[i];
          break;
        }
      }
    }

    // Update the map with current operation info
    final map = {
      ...order.toMap(),
      'current_operation': currentOp?.operation.name,
      'current_operation_start_time': currentOp?.startTime?.toIso8601String(),
      'current_operation_end_time': currentOp?.endTime?.toIso8601String(),
      'status': currentOp == null
          ? ProductionOrderStatus.pending.name
          : currentOp.endTime == null
              ? ProductionOrderStatus.inProgress.name
              : currentOp.operation == OperationStep.OP40
                  ? ProductionOrderStatus.completed.name
                  : ProductionOrderStatus.inProgress.name,
    };

    // Check if quantity has changed
    final currentQuantity =
        currentData.isNotEmpty ? currentData.first['po_quantity'] as int : null;
    final quantityChanged =
        currentQuantity != null && currentQuantity != order.poQuantity;

    // Add debug logging
    print('PO Update > Current quantity: $currentQuantity');
    print('PO Update > New quantity: ${order.poQuantity}');
    print('PO Update > Quantity changed: $quantityChanged');

    await db.update(
      'production_orders',
      map,
      where: 'id = ?',
      whereArgs: [order.id],
    );

    // Find the first operation that has been started
    final firstStartedOp = sortedOperations.firstWhere(
      (op) => op.startTime != null,
      orElse: () => sortedOperations.first,
    );

    // Always recompute quantities when PO is saved
    await recomputeOperationQuantities(
      order.id!,
      startFromOperationId: firstStartedOp.id,
    );

    // Log the change
    if (_auditService != null && currentData.isNotEmpty) {
      await _auditService!.logChange(
        tableName: 'production_orders',
        recordId: order.id!,
        action: AuditAction.update,
        oldValues: currentData.first,
        newValues: map,
      );
    }
  }

  Future<void> deleteProductionOrder(int id) async {
    final db = await database;

    // Get current data for audit
    final List<Map<String, dynamic>> currentData = await db.query(
      'production_orders',
      where: 'id = ?',
      whereArgs: [id],
    );

    await db.delete(
      'production_orders',
      where: 'id = ?',
      whereArgs: [id],
    );

    // Log the deletion
    if (_auditService != null && currentData.isNotEmpty) {
      await _auditService!.logChange(
        tableName: 'production_orders',
        recordId: id,
        action: AuditAction.delete,
        oldValues: currentData.first,
      );
    }
  }

  Future<int> getCount() async {
    final db = await database;
    final countResult =
        await db.rawQuery('SELECT COUNT(*) as count FROM your_table');
    return Sqflite.firstIntValue(countResult) ?? 0;
  }

  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      // Drop the old table and recreate with new schema
      await db.execute('DROP TABLE IF EXISTS production_orders');
      await db.execute('''
        CREATE TABLE production_orders(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          po_number TEXT UNIQUE NOT NULL,
          lot_number TEXT,
          po_quantity INTEGER NOT NULL,
          item_name TEXT,
          status TEXT NOT NULL,
          current_operation TEXT,
          current_operation_start_time TEXT,
          current_operation_end_time TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      ''');
    }

    if (oldVersion < 3) {
      // Drop and recreate operations-related tables
      await db.execute('DROP TABLE IF EXISTS operation_defects');
      await db.execute('DROP TABLE IF EXISTS operations');

      // Create operations table
      await db.execute('''
        CREATE TABLE operations(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          production_order_id INTEGER NOT NULL,
          operation TEXT NOT NULL,
          operator_id INTEGER,
          start_time TEXT,
          end_time TEXT,
          input_quantity INTEGER NOT NULL,
          output_quantity INTEGER,
          production_hours REAL,
          accumulated_man_hours REAL,
          rf INTEGER,
          encoded_by_id INTEGER,
          encoded_time TEXT,
          FOREIGN KEY (production_order_id) REFERENCES production_orders (id),
          FOREIGN KEY (operator_id) REFERENCES users (id),
          FOREIGN KEY (encoded_by_id) REFERENCES users (id)
        )
      ''');

      // Create operation_defects table
      await db.execute('''
        CREATE TABLE operation_defects(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          operation_id INTEGER NOT NULL,
          defect_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL,
          FOREIGN KEY (operation_id) REFERENCES operations (id),
          FOREIGN KEY (defect_id) REFERENCES defects (id),
          UNIQUE(operation_id, defect_id)
        )
      ''');
    }

    if (oldVersion < 4) {
      // Add new columns for operation timing
      await db.execute('''
        ALTER TABLE production_orders 
        ADD COLUMN current_operation_start_time TEXT
      ''');
      await db.execute('''
        ALTER TABLE production_orders 
        ADD COLUMN current_operation_end_time TEXT
      ''');
    }

    if (oldVersion < 5) {
      // Create audit_logs table
      await db.execute('''
        CREATE TABLE audit_logs(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_name TEXT NOT NULL,
          record_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          old_values TEXT,
          new_values TEXT,
          user_id INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      ''');
    }

    if (oldVersion < 6) {
      // Create operation_steps table
      await db.execute('''
        CREATE TABLE operation_steps(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          label TEXT NOT NULL,
          operation_number TEXT NOT NULL UNIQUE,
          step_order INTEGER NOT NULL
        )
      ''');

      // Insert default operation steps
      for (var step in OperationStep.defaultSteps) {
        await db.insert('operation_steps', {
          'label': step.label,
          'operation_number': step.operationNumber,
          'step_order': step.index,
        });
      }
    }
  }

  // Operation Management Methods
  Future<Operation> startOperation({
    required int productionOrderId,
    required OperationStep operation,
    required int operatorId,
    required int inputQuantity,
    required int encodedById,
  }) async {
    final db = await database;

    // Check if previous operation is completed
    if (operation != OperationStep.OP10) {
      final previousOp = OperationStep.values[operation.index - 1];
      final previousOpResult = await db.query(
        'operations',
        where: 'production_order_id = ? AND operation = ?',
        whereArgs: [productionOrderId, previousOp.name],
      );

      if (previousOpResult.isEmpty ||
          previousOpResult.first['end_time'] == null) {
        throw Exception('Previous operation must be completed first');
      }
    }

    // Get existing operation
    final List<Map<String, dynamic>> existingOp = await db.query(
      'operations',
      where: 'production_order_id = ? AND operation = ?',
      whereArgs: [productionOrderId, operation.name],
    );

    if (existingOp.isEmpty) {
      throw Exception('Operation not found');
    }

    // Update the operation with start details
    final startTime = DateTime.now();
    final updatedOperation = Operation(
      id: existingOp.first['id'] as int,
      productionOrderId: productionOrderId,
      operation: operation,
      operatorId: operatorId,
      startTime: startTime,
      inputQuantity: inputQuantity,
      encodedById: encodedById,
      encodedTime: startTime,
    );

    await db.update(
      'operations',
      updatedOperation.toMap(),
      where: 'id = ?',
      whereArgs: [updatedOperation.id],
    );

    // Update the production order's current operation and status
    await db.update(
      'production_orders',
      {
        'current_operation': operation.name,
        'status': ProductionOrderStatus.inProgress.name,
        'current_operation_start_time': startTime.toIso8601String(),
        'current_operation_end_time': null,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [productionOrderId],
    );

    // Log the operation start
    if (_auditService != null) {
      await _auditService!.logChange(
        tableName: 'operations',
        recordId: updatedOperation.id!,
        action: AuditAction.update,
        oldValues: existingOp.first,
        newValues: updatedOperation.toMap(),
      );
    }

    return updatedOperation;
  }

  Future<Operation> endOperation({
    required int operationId,
    required int outputQuantity,
    required int rf,
  }) async {
    final db = await database;

    // Get the operation
    final List<Map<String, dynamic>> maps = await db.query(
      'operations',
      where: 'id = ?',
      whereArgs: [operationId],
    );

    if (maps.isEmpty) {
      throw Exception('Operation not found');
    }

    final operation = Operation.fromMap(maps.first);
    if (operation.startTime == null) {
      throw Exception('Cannot end operation that has not been started');
    }

    final endTime = DateTime.now();

    // Calculate production hours
    final productionHours =
        endTime.difference(operation.startTime!).inMinutes / 60;

    // Calculate accumulated man hours
    final accumulatedManHours = productionHours * rf;

    // Update operation
    final updatedOperation = Operation(
      id: operationId,
      productionOrderId: operation.productionOrderId,
      operation: operation.operation,
      operatorId: operation.operatorId,
      startTime: operation.startTime,
      endTime: endTime,
      inputQuantity: operation.inputQuantity,
      outputQuantity: outputQuantity,
      productionHours: productionHours,
      accumulatedManHours: accumulatedManHours,
      rf: rf,
      encodedById: operation.encodedById,
      encodedTime: operation.encodedTime,
    );

    await db.update(
      'operations',
      updatedOperation.toMap(),
      where: 'id = ?',
      whereArgs: [operationId],
    );

    // Recompute quantities for this and subsequent operations
    await recomputeOperationQuantities(
      operation.productionOrderId,
      startFromOperationId: operationId,
    );

    // Log the operation end
    if (_auditService != null) {
      await _auditService!.logChange(
        tableName: 'operations',
        recordId: operationId,
        action: AuditAction.update,
        oldValues: operation.toMap(),
        newValues: updatedOperation.toMap(),
      );
    }

    // Check if this is the last operation (QC Sampling OP40)
    final isLastOperation = operation.operation == OperationStep.OP40;

    // Update production order with end time and status if it's the last operation
    await db.update(
      'production_orders',
      {
        'current_operation_end_time': endTime.toIso8601String(),
        'status': isLastOperation
            ? ProductionOrderStatus.completed.name
            : ProductionOrderStatus.inProgress.name,
        'updated_at': DateTime.now().toIso8601String(),
      },
      where: 'id = ?',
      whereArgs: [operation.productionOrderId],
    );

    // If not the last operation, update the next operation's input quantity
    if (!isLastOperation) {
      final nextOp = OperationStep.values[operation.operation.index + 1];
      await db.update(
        'operations',
        {'input_quantity': outputQuantity},
        where: 'production_order_id = ? AND operation = ?',
        whereArgs: [operation.productionOrderId, nextOp.name],
      );
    }

    return updatedOperation;
  }

  Future<List<Operation>> getActiveOperations(int productionOrderId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'operations',
      where: 'production_order_id = ? AND end_time IS NULL',
      whereArgs: [productionOrderId],
    );
    return List.generate(maps.length, (i) => Operation.fromMap(maps[i]));
  }

  Future<Operation?> getLastCompletedOperation(int productionOrderId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'operations',
      where: 'production_order_id = ? AND end_time IS NOT NULL',
      whereArgs: [productionOrderId],
      orderBy: 'end_time DESC',
      limit: 1,
    );
    if (maps.isEmpty) return null;
    return Operation.fromMap(maps.first);
  }

  // Operation Defect Management Methods
  Future<void> addOperationDefect(OperationDefect defect) async {
    final db = await database;
    final id = await db.insert('operation_defects', defect.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace);

    // Log the creation/update only if audit service is available and initialized
    try {
      if (_auditService != null) {
        await _auditService!.logChange(
          tableName: 'operation_defects',
          recordId: id,
          action: AuditAction.create,
          newValues: {...defect.toMap(), 'id': id},
        );
      }
    } catch (e) {
      print('Warning: Failed to log audit trail: $e');
      // Continue execution even if audit logging fails
    }
  }

  Future<void> updateOperationDefect(OperationDefect defect) async {
    final db = await database;

    // Get current data for audit
    final List<Map<String, dynamic>> currentData = await db.query(
      'operation_defects',
      where: 'operation_id = ? AND defect_id = ?',
      whereArgs: [defect.operationId, defect.defectId],
    );

    await db.update(
      'operation_defects',
      defect.toMap(),
      where: 'operation_id = ? AND defect_id = ?',
      whereArgs: [defect.operationId, defect.defectId],
    );

    // Log the update
    if (_auditService != null && currentData.isNotEmpty) {
      await _auditService!.logChange(
        tableName: 'operation_defects',
        recordId: defect.id!,
        action: AuditAction.update,
        oldValues: currentData.first,
        newValues: defect.toMap(),
      );
    }
  }

  Future<List<OperationDefect>> getOperationDefects(int operationId) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'operation_defects',
      where: 'operation_id = ?',
      whereArgs: [operationId],
    );

    return List.generate(maps.length, (i) {
      return OperationDefect.fromMap(maps[i]);
    });
  }

  Future<int> getTotalDefects(int operationId) async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT 
        SUM(
          CASE 
            WHEN d.reworkable = 1 THEN od.quantity - od.quantity_rework
            ELSE od.quantity
          END
        ) as total 
      FROM operation_defects od
      JOIN defects d ON od.defect_id = d.id
      WHERE od.operation_id = ?
    ''', [operationId]);
    return (result.first['total'] as int?) ?? 0;
  }

  Future<int> getTotalProduction() async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT SUM(po_quantity) as total
      FROM production_orders
      WHERE status = ?
    ''', [ProductionOrderStatus.completed.name]);

    return result.first['total'] as int? ?? 0;
  }

  Future<int> getActiveOrdersCount() async {
    final db = await database;
    final result = await db.rawQuery('''
      SELECT COUNT(*) as count 
      FROM production_orders 
      WHERE status = ?
    ''', [ProductionOrderStatus.inProgress.name]);
    return result.first['count'] as int? ?? 0;
  }

  Future<double> getMachineUtilization() async {
    final db = await database;
    final now = DateTime.now();

    // Get total production hours for today
    final result = await db.rawQuery('''
      SELECT SUM(o.production_hours) as total_hours
      FROM operations o
      WHERE date(o.start_time) = date('now')
      AND o.end_time IS NOT NULL
    ''');

    final totalProductionHours =
        (result.first['total_hours'] as num?)?.toDouble() ?? 0;

    // Get unique machines from defects table that had defects recorded today
    final machinesResult = await db.rawQuery('''
      SELECT COUNT(DISTINCT d.machine) as machine_count
      FROM defects d
      JOIN operation_defects od ON od.defect_id = d.id
      JOIN operations o ON od.operation_id = o.id
      WHERE date(o.start_time) = date('now')
      AND d.machine IS NOT NULL
    ''');

    final machineCount = machinesResult.first['machine_count'] as int? ?? 1;
    final totalAvailableHours = machineCount * 8.0; // 8 hours per machine

    return totalAvailableHours > 0
        ? (totalProductionHours / totalAvailableHours)
        : 0;
  }

  Future<double> getCurrentDefectRate() async {
    final db = await database;

    // Get all completed operations with their defects
    final result = await db.rawQuery('''
      WITH CompletedOperations AS (
        SELECT 
          o.id,
          o.production_order_id,
          o.operation,
          o.input_quantity,
          o.output_quantity,
          COALESCE(SUM(d.quantity), 0) as defect_quantity,
          CASE 
            WHEN o.operation = ? THEN 1
            WHEN o.operation = ? THEN 2
            WHEN o.operation = ? THEN 3
            WHEN o.operation = ? THEN 4
            WHEN o.operation = ? THEN 5
          END as step_order
        FROM operations o
        LEFT JOIN operation_defects d ON o.id = d.operation_id
        WHERE o.end_time IS NOT NULL
        GROUP BY o.id, o.production_order_id, o.operation, o.input_quantity, o.output_quantity
        ORDER BY production_order_id, step_order
      )
      SELECT 
        SUM(defect_quantity) as total_defects,
        SUM(input_quantity) as total_input,
        COUNT(*) as operation_count
      FROM CompletedOperations
    ''', [
      OperationStep.OP10.name,
      OperationStep.OP15.name,
      OperationStep.OP20.name,
      OperationStep.OP30.name,
      OperationStep.OP40.name,
    ]);

    // For debugging
    print('Dashboard > Defect re-calculation...');
    // print('Total input: ${result.first['total_input']}');
    // print('Total defects: ${result.first['total_defects']}');
    // print('Operation count: ${result.first['operation_count']}');

    final totalInput = (result.first['total_input'] as int?) ?? 0;
    final totalDefects = (result.first['total_defects'] as int?) ?? 0;
    final operationCount = (result.first['operation_count'] as int?) ?? 0;

    // If no completed operations, return 0
    if (operationCount == 0 || totalInput == 0) return 0.0;

    return totalDefects / totalInput;
  }

  Future<void> debugDefectData() async {
    final db = await database;

    // Check operations
    final ops = await db.rawQuery('''
      SELECT 
        id,
        production_order_id,
        operation,
        input_quantity,
        output_quantity,
        start_time,
        end_time
      FROM operations
      WHERE date(start_time) = date('now')
    ''');
    print('Today\'s Operations:');
    for (var op in ops) {
      print(op);
    }

    // Check defects
    final defects = await db.rawQuery('''
      SELECT 
        od.operation_id,
        od.quantity,
        d.name as defect_name
      FROM operation_defects od
      JOIN defects d ON od.defect_id = d.id
      JOIN operations o ON od.operation_id = o.id
      WHERE date(o.start_time) = date('now')
    ''');
    print('\nToday\'s Defects:');
    for (var defect in defects) {
      print(defect);
    }
  }

  Future<List<Map<String, dynamic>>> getDailyDefectRatios(
      {int days = 7}) async {
    final db = await database;

    final result = await db.rawQuery('''
      WITH daily_stats AS (
        SELECT 
          date(o.start_time) as operation_date,
          SUM(o.input_quantity) as total_input,
          SUM(COALESCE(od.quantity, 0)) as total_defects
        FROM operations o
        LEFT JOIN operation_defects od ON o.id = od.operation_id
        WHERE o.end_time IS NOT NULL
          AND date(o.start_time) >= date('now', '-$days days')
          AND date(o.start_time) <= date('now')
        GROUP BY date(o.start_time)
      )
      SELECT 
        operation_date,
        CAST(total_defects AS FLOAT) / NULLIF(total_input, 0) as defect_ratio,
        total_input,
        total_defects
      FROM daily_stats
      ORDER BY operation_date ASC
    ''');

    print('Daily Defect Ratios Query Result:');
    print(result);
    return result;
  }

  Future<List<Map<String, dynamic>>> getTopDefectsPerMachine(
      {int limit = 5}) async {
    final db = await database;

    final result = await db.rawQuery('''
      SELECT 
        d.machine,
        COUNT(DISTINCT od.id) as defect_types,
        SUM(od.quantity) as defect_count
      FROM defects d
      JOIN operation_defects od ON od.defect_id = d.id
      JOIN operations o ON od.operation_id = o.id
      WHERE date(o.start_time) = date('now')
        AND o.end_time IS NOT NULL
        AND d.machine IS NOT NULL
      GROUP BY d.machine
      HAVING defect_count > 0
      ORDER BY defect_count DESC
      LIMIT ?
    ''', [limit]);

    print('Top Defects per Machine Query Result:');
    print(result);
    return result;
  }

  Future<List<Map<String, dynamic>>> getMostFrequentDefects(
      {int limit = 5}) async {
    final db = await database;

    final result = await db.rawQuery('''
      SELECT 
        d.name as defect_name,
        d.category as defect_category,
        COUNT(DISTINCT od.operation_id) as affected_operations,
        SUM(od.quantity) as occurrence_count
      FROM operation_defects od
      JOIN defects d ON od.defect_id = d.id
      JOIN operations o ON od.operation_id = o.id
      WHERE date(o.start_time) = date('now')
        AND o.end_time IS NOT NULL
      GROUP BY d.id, d.name, d.category
      HAVING occurrence_count > 0
      ORDER BY occurrence_count DESC
      LIMIT ?
    ''', [limit]);

    print('Most Frequent Defects Query Result:');
    print(result);
    return result;
  }

  Future<List<User>> getAllUsers() async {
    final Database db = await database;

    try {
      final List<Map<String, dynamic>> maps = await db.query('users');
      return maps.map((map) => User.fromMap(map)).toList();
    } catch (e) {
      print('Get all users error: $e');
      rethrow;
    }
  }

  Future<void> createUser({
    required String username,
    required String password,
    String? name,
    String? email,
    required String role,
  }) async {
    final Database db = await database;

    try {
      // Check if username already exists
      final exists = !(await isUsernameAvailable(username));
      if (exists) {
        throw Exception('Username already exists');
      }

      final userData = {
        'username': username,
        'password': password,
        'name': name,
        'email': email,
        'role': role,
        'is_active': 1,
        'created_at': DateTime.now().toIso8601String(),
      };

      final id = await db.insert('users', userData);

      // Log the creation
      if (_auditService != null) {
        await _auditService!.logChange(
          tableName: 'users',
          recordId: id,
          action: AuditAction.create,
          newValues: {...userData, 'id': id},
        );
      }
    } catch (e) {
      print('Create user error: $e');
      rethrow;
    }
  }

  Future<void> updateOperation(
      int operationId, Map<String, dynamic> values) async {
    final db = await database;

    // Get current data for audit
    final List<Map<String, dynamic>> currentData = await db.query(
      'operations',
      where: 'id = ?',
      whereArgs: [operationId],
    );

    await db.update(
      'operations',
      values,
      where: 'id = ?',
      whereArgs: [operationId],
    );

    // Log the update if audit service is available and we have current data
    if (_auditService != null && currentData.isNotEmpty) {
      await _auditService!.logChange(
        tableName: 'operations',
        recordId: operationId,
        action: AuditAction.update,
        oldValues: currentData.first,
        newValues: {
          ...currentData.first,
          ...values
        }, // Merge current data with updates
      );
    }
  }

  Future<void> recomputeOperationQuantities(int productionOrderId,
      {int? startFromOperationId}) async {
    try {
      print(
          'Recomputing quantities for PO $productionOrderId, starting from operation $startFromOperationId');

      // Get all operations for this PO
      final operations = await getOperationsForPO(productionOrderId);
      print('Found ${operations.length} operations for PO');

      // Sort operations by their step order
      final sortedOperations = operations.toList()
        ..sort((a, b) => a.operation.index.compareTo(b.operation.index));

      // Get PO quantity for the first operation's input
      final po = await getProductionOrder(productionOrderId);
      if (po == null) throw Exception('Production order not found');
      print('PO quantity: ${po.poQuantity}');

      // Process operations that have been started
      for (var i = 0; i < sortedOperations.length; i++) {
        final operation = sortedOperations[i];

        // Skip operations that haven't started
        /* if (operation.startTime == null) {
          print('\nSkipping non-started operation ${operation.operation.name}');
          continue;
        } */

        print('\nProcessing started operation ${operation.operation.name}:');
        print('- Current input quantity: ${operation.inputQuantity}');
        print('- Current output quantity: ${operation.outputQuantity}');

        // Calculate input quantity
        int inputQuantity;
        if (i == 0) {
          // First operation always gets PO quantity
          inputQuantity = po.poQuantity;
        } else {
          final previousOp = sortedOperations[i - 1];
          if (previousOp.endTime != null) {
            // Previous operation is completed, use its output
            inputQuantity =
                previousOp.outputQuantity ?? previousOp.inputQuantity;
          } else {
            // Previous operation not completed or not started, use this operation's current input
            inputQuantity = operation.inputQuantity;
          }
        }

        // Get operation's defects
        final defects = await getTotalDefects(operation.id!);
        print('- Total defects: $defects');

        // Calculate new output (if operation is completed)
        int? outputQuantity;
        if (operation.endTime != null) {
          outputQuantity = inputQuantity - defects;

          // If there's a next operation that has been started, update its input
          if (i < sortedOperations.length - 1) {
            final nextOp = sortedOperations[i + 1];
            if (nextOp.startTime != null) {
              print(
                  '- Updating next operation ${nextOp.operation.name} input to: $outputQuantity');
              await updateOperation(
                nextOp.id!,
                {'input_quantity': outputQuantity},
              );
            }
          }
        }

        print('- New input quantity: $inputQuantity');
        print('- New output quantity: $outputQuantity');

        // Update the current operation
        await updateOperation(
          operation.id!,
          {
            'input_quantity': inputQuantity,
            'output_quantity': outputQuantity,
          },
        );
      }
      print('Recomputation completed successfully');
    } catch (e) {
      print('Error during recomputation: $e');
      rethrow;
    }
  }

  Future<ProductionOrder?> getProductionOrder(int id) async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> maps = await db.query(
        'production_orders',
        where: 'id = ?',
        whereArgs: [id],
      );

      if (maps.isEmpty) return null;
      return ProductionOrder.fromMap(maps.first);
    } catch (e) {
      rethrow;
    }
  }

  Future<List<OperationStep>> getAllOperationSteps() async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'operation_steps',
      orderBy: 'step_order ASC',
    );
    return List.generate(maps.length, (i) => OperationStep.fromMap(maps[i]));
  }

  Future<OperationStep> getOperationStepByNumber(String operationNumber) async {
    final db = await database;
    final List<Map<String, dynamic>> maps = await db.query(
      'operation_steps',
      where: 'operation_number = ?',
      whereArgs: [operationNumber],
    );

    if (maps.isEmpty) {
      throw Exception('Operation step not found');
    }

    return OperationStep.fromMap(maps.first);
  }

  Future<int> insertOperationStep(OperationStep step) async {
    final db = await database;
    return await db.insert('operation_steps', step.toMap());
  }

  Future<int> updateOperationStep(OperationStep step) async {
    final db = await database;
    return await db.update(
      'operation_steps',
      step.toMap(),
      where: 'id = ?',
      whereArgs: [step.id],
    );
  }

  Future<int> deleteOperationStep(int id) async {
    final db = await database;
    return await db.delete(
      'operation_steps',
      where: 'id = ?',
      whereArgs: [id],
    );
  }

  Future<void> _initializeOperationSteps() async {
    try {
      final steps = await getAllOperationSteps();
      if (steps.isEmpty) {
        // If no steps in database, insert defaults
        for (var step in OperationStep.defaultSteps) {
          await insertOperationStep(step);
        }
        OperationStep.setValues(OperationStep.defaultSteps);
      } else {
        // Use steps from database
        OperationStep.setValues(steps);
      }
    } catch (e) {
      print('Failed to initialize operation steps: $e');
      // Fallback to defaults
      OperationStep.setValues(OperationStep.defaultSteps);
    }
  }

  // Public method to check defects count
  Future<int> getDefectsCount() async {
    final db = await database;
    final result = await db.rawQuery('SELECT COUNT(*) as count FROM defects');
    final count = Sqflite.firstIntValue(result) ?? 0;
    print('Current defects count in database: $count');
    return count;
  }

  // Public method to force reload defects
  Future<bool> forceReloadDefects() async {
    try {
      final db = await database;

      // First verify if we can read the asset
      print('Testing asset access...');
      final assetManifest = await rootBundle.loadString('AssetManifest.json');
      print('Asset manifest: $assetManifest');

      // Try to read the CSV file
      print('Attempting to read defects CSV...');
      final csvExists = await rootBundle
          .load('assets/defects_masterlist.csv')
          .then((_) => true)
          .catchError((e) {
        print('Error loading CSV: $e');
        return false;
      });

      if (!csvExists) {
        print('CSV file not found in assets!');
        return false;
      }

      // If we got here, we can read the file, so populate defects
      await _populateDefaultDefects(db);

      // Verify the count
      final count = await getDefectsCount();
      print('After reload: $count defects in database');
      return count > 0;
    } catch (e, stackTrace) {
      print('Error in forceReloadDefects: $e');
      print('Stack trace: $stackTrace');
      return false;
    }
  }

  Future<User?> getFirstAdminUser() async {
    final db = await database;
    final users = await db.query(
      'users',
      where: 'role = ?',
      whereArgs: ['admin'],
      limit: 1,
    );
    if (users.isNotEmpty) {
      return User.fromMap(users.first);
    }
    return null;
  }
}
