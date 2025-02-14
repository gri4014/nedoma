import pool from '../../config/database';
import { BaseModel } from '../base/BaseModel';
import { ICustomer, IUpdatePreferences } from '../interfaces/customer';
import { customerSchema, createCustomerSchema, updatePreferencesSchema } from '../schemas/customer';

class CustomerModel extends BaseModel<ICustomer> {
  protected tableName = 'customers';
  protected schema = customerSchema;

  constructor() {
    super();
  }

  /**
   * Create a new customer
   */
  async createCustomer(phoneNumber: string, deviceId?: string): Promise<{ success: boolean; customer?: ICustomer; error?: string }> {
    try {
      const defaultPreferences = {
        dietary_restrictions: [],
        allergies: [],
        taste_preferences: []
      };

      // Create customer data
      const customerData = {
        phone_number: phoneNumber,
        device_id: deviceId,
        preferences: defaultPreferences,
        last_visit: new Date() // Set initial visit time
      };

      console.log('[CustomerModel] Creating customer with data:', customerData);

      // Validate with createCustomerSchema first
      const validation = createCustomerSchema.safeParse(customerData);
      if (!validation.success) {
        console.error('[CustomerModel] Validation failed:', validation.error);
        return {
          success: false,
          error: `Invalid customer data: ${validation.error.errors.map(e => e.message).join(', ')}`
        };
      }

      // Insert into database
      const result = await pool.query(
        `INSERT INTO customers (phone_number, device_id, preferences, last_visit)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [phoneNumber, deviceId, defaultPreferences, new Date()]
      );

      // Validate returned data with full schema
      const fullValidation = this.schema.safeParse(result.rows[0]);
      if (!fullValidation.success) {
        console.error('[CustomerModel] Full validation failed:', fullValidation.error);
        return {
          success: false,
          error: `Database returned invalid data: ${fullValidation.error.errors.map(e => e.message).join(', ')}`
        };
      }

      return {
        success: true,
        customer: result.rows[0]
      };
    } catch (error) {
      console.error('[CustomerModel] Error creating customer:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create customer'
      };
    }
  }

  /**
   * Find customer by phone number
   */
  async findByPhone(phoneNumber: string): Promise<{ success: boolean; customer?: ICustomer; error?: string }> {
    try {
      const result = await pool.query(
        `SELECT * FROM customers WHERE phone_number = $1`,
        [phoneNumber]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Customer not found'
        };
      }

      return {
        success: true,
        customer: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find customer'
      };
    }
  }

  /**
   * Find customer by device ID
   */
  async findByDevice(deviceId: string): Promise<{ success: boolean; customer?: ICustomer; error?: string }> {
    try {
      const result = await pool.query(
        `SELECT * FROM customers WHERE device_id = $1`,
        [deviceId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Customer not found'
        };
      }

      return {
        success: true,
        customer: result.rows[0]
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find customer'
      };
    }
  }

  /**
   * Link device to customer
   */
  async linkDevice(customerId: string, deviceId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await pool.query(
        `UPDATE customers 
         SET device_id = $1
         WHERE id = $2`,
        [deviceId, customerId]
      );

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to link device'
      };
    }
  }

  /**
   * Update customer preferences
   */
  async updatePreferences(customerId: string, preferences: IUpdatePreferences): Promise<{ success: boolean; error?: string }> {
    try {
      const validation = updatePreferencesSchema.safeParse(preferences);

      if (!validation.success) {
        return {
          success: false,
          error: 'Invalid preferences data'
        };
      }

      // Get current preferences
      const currentResult = await pool.query(
        `SELECT preferences FROM customers WHERE id = $1`,
        [customerId]
      );

      if (currentResult.rows.length === 0) {
        return {
          success: false,
          error: 'Customer not found'
        };
      }

      const currentPreferences = currentResult.rows[0].preferences;

      // Merge new preferences with existing ones
      const updatedPreferences = {
        dietary_restrictions: preferences.dietary_restrictions || currentPreferences.dietary_restrictions,
        allergies: preferences.allergies || currentPreferences.allergies,
        taste_preferences: preferences.taste_preferences || currentPreferences.taste_preferences
      };

      await pool.query(
        `UPDATE customers 
         SET preferences = $1
         WHERE id = $2`,
        [updatedPreferences, customerId]
      );

      return {
        success: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update preferences'
      };
    }
  }

  /**
   * Get customer preferences
   */
  async getPreferences(customerId: string): Promise<{ success: boolean; preferences?: IUpdatePreferences; error?: string }> {
    try {
      // Validate customerId format
      if (!customerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
        return {
          success: false,
          error: 'Invalid customer ID format'
        };
      }

      const result = await pool.query(
        `SELECT c.preferences, c.created_at 
         FROM customers c 
         WHERE c.id = $1`,
        [customerId]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'Customer not found or has been deleted'
        };
      }

      const preferences = result.rows[0].preferences;
      
      // Validate preferences structure
      if (!preferences || typeof preferences !== 'object') {
        return {
          success: false,
          error: 'Invalid preferences data structure'
        };
      }

      // Ensure all required preference fields exist
      const requiredFields = ['dietary_restrictions', 'allergies', 'taste_preferences'];
      for (const field of requiredFields) {
        if (!Array.isArray(preferences[field])) {
          preferences[field] = []; // Initialize empty array if field is missing or invalid
        }
      }

      return {
        success: true,
        preferences: {
          dietary_restrictions: preferences.dietary_restrictions,
          allergies: preferences.allergies,
          taste_preferences: preferences.taste_preferences
        }
      };
    } catch (error) {
      console.error('[CustomerModel] Error retrieving preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? 
          `Database error: ${error.message}` : 
          'Failed to get preferences due to database error'
      };
    }
  }
}

export const customerModel = new CustomerModel();
