import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { AuthService } from '../auth/auth.service.js';

describe('UsersController', () => {
  it('delegates user lookup to the service', async () => {
    const findOne = vi.fn().mockResolvedValue({ id: 1 });
    const controller = new UsersController(
      {
        findOne,
      } as unknown as UsersService,
      {} as AuthService,
    );
    expect(await controller.findOne(1)).toEqual({ id: 1 });
    expect(findOne).toHaveBeenCalledWith(1);
  });
});
