import { Request, Response } from 'express';
import Restaurant from '../models/restaurant'; // Your Restaurant model
// import { getRestaurant } from './RestaurantController'; // Your controller
// import getRestaurant from "./RestaurantController"
import RestaurantController from './RestaurantController';


jest.mock('../models/restaurant'); // Mock the Restaurant model

describe('getRestaurant', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    // Mock Express Request and Response objects
    req = {
      params: {
        restaurantId: '123',
      },
    };

    jsonMock = jest.fn();
    statusMock = jest.fn(() => ({ json: jsonMock })) as unknown as jest.Mock;

    res = {
      status: statusMock,
      json: jsonMock,
    };
  });

  it('should return 404 if the restaurant is not found', async () => {
    // Mock Restaurant.findById to return null
    (Restaurant.findById as jest.MockedFunction<typeof Restaurant.findById>).mockResolvedValue(null);

    // await getRestaurant(req as Request, res as Response);
    await RestaurantController.getRestaurant(req as Request, res as Response);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'restaurant not found' });
  });

//   it('should return 500 if there is a server error', async () => {
//     // Mock Restaurant.findById to throw an error
//     (Restaurant.findById as jest.MockedFunction<typeof Restaurant.findById>).mockRejectedValue(new Error('Server error'));

//     // await getRestaurant(req as Request, res as Response);
//     await RestaurantController.getRestaurant(req as Request, res as Response);

//     expect(statusMock).toHaveBeenCalledWith(500);
//     expect(jsonMock).toHaveBeenCalledWith({ message: 'something went wrong' });
//   });

    it('should return 500 if there is a server error', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {}); // Suppress console.log
  
    (Restaurant.findById as jest.MockedFunction<typeof Restaurant.findById>).mockRejectedValue(new Error('Server error'));
  
    await RestaurantController.getRestaurant(req as Request, res as Response);
    
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({ message: 'something went wrong' });
  
    consoleLogSpy.mockRestore(); // Restore console.log after the test
  });

  it('should return the restaurant if found', async () => {
    // Mock Restaurant.findById to return a restaurant object
    const mockRestaurant = { id: '123', name: 'Test Restaurant' };
    (Restaurant.findById as jest.MockedFunction<typeof Restaurant.findById>).mockResolvedValue(mockRestaurant);

    // await getRestaurant(req as Request, res as Response);
    await RestaurantController.getRestaurant(req as Request, res as Response);



    expect(statusMock).not.toHaveBeenCalled(); // No status method means 200 OK by default
    expect(jsonMock).toHaveBeenCalledWith(mockRestaurant);
  });
});
