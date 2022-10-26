import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: productData } = await api.get(`/products/${productId}`)

      const { data: { amount: remainingItems } } = await api.get(`/stock/${productId}`)

      const productIndex = cart.findIndex(product => product.id === productId)

      let newCart: Product[] = []

      if (productIndex < 0) {
        const productAmount = 1;

        if (productAmount > remainingItems) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }

        newCart = [...cart, { ...productData, amount: productAmount }]
      } else {
        const productAmount = cart[productIndex].amount + 1

        if (productAmount > remainingItems) {
          toast.error('Quantidade solicitada fora de estoque');
          return
        }

        newCart = cart.map(product => {
          if (product.id === productId) {
            return {
              ...product,
              amount: productAmount
            }
          }

          return product
        })
      }

      setCart(newCart)
        
      const cartJSON = JSON.stringify(newCart)
      localStorage.setItem('@RocketShoes:cart', cartJSON)
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productIndex = cart.findIndex(product => product.id === productId)

      if(productIndex < 0) {
        throw new Error('Produto não existe')
      }

      const newCart = cart.filter(product => product.id !== productId)
      setCart(newCart)

      const cartJSON = JSON.stringify(newCart)
      localStorage.setItem('@RocketShoes:cart', cartJSON)
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) return

      const productIndex = cart.findIndex(product => product.id === productId)

      if(productIndex < 0) {
        throw new Error('Produto não existe')
      }

      const { data: { amount: remainingItems } } = await api.get(`/stock/${productId}`)

      if(amount > remainingItems) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }
      
      const newCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount
          }
        }

        return product
      })
      setCart(newCart)

      const cartJSON = JSON.stringify(newCart)
      localStorage.setItem('@RocketShoes:cart', cartJSON)
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
