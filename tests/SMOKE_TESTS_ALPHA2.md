# LIVE SMOKE — v0.1.5-alpha.2 Modern C++ Compiler Integration

Проверять после публикации GitHub Pages и завершения CDN propagation.

## 1. Версия

Открыть страницу с `?v=0.1.5-alpha.2`.
Ожидается: верхняя плашка `v0.1.5 α2`.

## 2. Быстрый Browser Runtime не регрессировал

```cpp
#include <iostream>
int main(){
    std::cout << "Hello Nexus\n";
    return 0;
}
```

Ожидается:
- `AUTO · Nexus Browser Runtime`;
- stdout `Hello Nexus`;
- exit code `0`.

## 3. Modern C++ → реальный WASM provider

```cpp
#include <iostream>
#include <string>
#include <vector>
#include <memory>

class Device {
public:
    virtual ~Device() = default;
    virtual std::string name() const = 0;
};

class Printer final : public Device {
public:
    std::string name() const override {
        return "Printer";
    }
};

int main() {
    std::vector<std::unique_ptr<Device>> devices;
    devices.push_back(std::make_unique<Printer>());
    std::cout << devices[0]->name() << '\n';
}
```

При первом запуске допустима длительная стадия загрузки toolchain.
Ожидается:
- Router выбирает `Nexus WASM C++ Runtime` без Browser fallback;
- UI проходит фазы загрузка compiler → компиляция → WASI execution;
- stdout `Printer`;
- exit code `0`;
- вывод содержит `Компилятор: Clang/LLVM ... wasm32-wasip1`.

## 4. Реальная диагностика Clang

Использовать:

```cpp
#include <iostream>
int main(){
    std::cout << "broken" << ;
}
```

Ожидается:
- красная compiler diagnostic, а не `ограничение среды`;
- указаны строка/столбец;
- технический вывод содержит исходное сообщение Clang.

## 5. Self-test

Нажать `Проверить среду`.
Ожидается после успешной загрузки toolchain:
- базовый Browser probe PASS;
- Modern C++ OOP probe PASS через `Nexus WASM C++ Runtime`.

## 6. Mobile

На Android/iPhone первый Modern C++ запуск может быть заметно дольше из-за размера compiler-assets. Проверить отсутствие зависания UI во время фаз загрузки/компиляции. Mobile PASS фиксировать только по реальному устройству.
